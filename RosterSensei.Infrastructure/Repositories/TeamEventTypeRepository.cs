using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace RosterSensei.Infrastructure.Repositories;

public class TeamEventTypeRepository : ITeamEventTypeRepository
{
    private readonly AppDbContext _context;

    public TeamEventTypeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TeamEventType>> GetByTeamAsync(int teamId, CancellationToken cancellationToken = default)
    {
        // Oldest first, with "Other" always at the end.
        return await _context.TeamEventTypes
            .AsNoTracking()
            .Where(t => t.TeamId == teamId)
            .OrderBy(t => t.Preset == EventTypePreset.Other)
            .ThenBy(t => t.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<TeamEventType?> GetByIdAsync(int teamId, int typeId)
    {
        return await _context.TeamEventTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == typeId && t.TeamId == teamId);
    }

    public async Task<WriteOutcome> AddAsync(TeamEventType type)
    {
        _context.TeamEventTypes.Add(type);
        try
        {
            await _context.SaveChangesAsync();
            return WriteOutcome.Done;
        }
        catch (DbUpdateException)
        {
            // A unique index caught a duplicate name or preset.
            _context.ChangeTracker.Clear();
            return WriteOutcome.Conflict;
        }
    }

    public async Task<WriteOutcome> UpdateAsync(int teamId, int typeId, string name, string color)
    {
        try
        {
            // The WHERE clause keeps "Other" untouchable even if the service check were skipped.
            var updated = await _context.TeamEventTypes
                .Where(t => t.Id == typeId && t.TeamId == teamId && (t.Preset == null || t.Preset != EventTypePreset.Other))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Name, name)
                    .SetProperty(t => t.Color, color));

            return updated == 1 ? WriteOutcome.Done : WriteOutcome.Rejected;
        }
        catch (Exception ex) when (ex is DbUpdateException or DbException)
        {
            return WriteOutcome.Conflict;
        }
    }

    public async Task<WriteOutcome> DeleteAsync(int teamId, int typeId)
    {
        var removed = await RemoveTypesAsync(teamId, typeId);
        return removed switch
        {
            null => WriteOutcome.Conflict,
            0 => WriteOutcome.Rejected,
            _ => WriteOutcome.Done
        };
    }

    public Task<int?> DeleteAllExceptOtherAsync(int teamId) => RemoveTypesAsync(teamId, typeId: null);

    // Moves the events of one type (or of every type but "Other" when typeId is null) to "Other",
    // then deletes those types. Serializable keeps the moved range locked until commit, so an event
    // saved with a removed type at the same moment fails its foreign key check instead of being orphaned.
    private async Task<int?> RemoveTypesAsync(int teamId, int? typeId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var otherId = await _context.TeamEventTypes
                .Where(t => t.TeamId == teamId && t.Preset == EventTypePreset.Other)
                .Select(t => (int?)t.Id)
                .FirstOrDefaultAsync();

            if (otherId == null)
            {
                // Every team gets "Other" when it's created; without it there's nowhere to move the events.
                await transaction.RollbackAsync();
                return 0;
            }

            var types = _context.TeamEventTypes
                .Where(t => t.TeamId == teamId && t.Id != otherId && (typeId == null || t.Id == typeId));

            // Bumping the version makes an editor that's open on a moved event reload instead of saving
            // the old type back.
            await _context.TeamEvents
                .Where(e => e.TeamId == teamId && types.Any(t => t.Id == e.EventTypeId))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(e => e.EventTypeId, otherId.Value)
                    .SetProperty(e => e.Version, e => e.Version + 1));

            var deleted = await types.ExecuteDeleteAsync();

            await transaction.CommitAsync();
            return deleted;
        }
        catch (Exception ex) when (ex is DbUpdateException or DbException)
        {
            // A deadlock with a simultaneous write, or an event added with the type after it was moved.
            return null;
        }
    }
}
