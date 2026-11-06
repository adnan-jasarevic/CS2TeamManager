using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace RosterSensei.Infrastructure.Repositories;

public class TeamEventRepository : ITeamEventRepository
{
    private readonly AppDbContext _context;

    public TeamEventRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TeamEvent>> GetEventsAsync(int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        return await _context.TeamEvents
            .Where(e => e.TeamId == teamId && e.StartTime < to && e.EndTime > from)
            .OrderBy(e => e.StartTime)
            .ToListAsync(cancellationToken);
    }

    public async Task<TeamEvent?> GetByIdAsync(int teamId, int eventId)
    {
        return await _context.TeamEvents.FirstOrDefaultAsync(e => e.Id == eventId && e.TeamId == teamId);
    }

    public async Task<TeamEvent?> AddAsync(TeamEvent teamEvent)
    {
        _context.TeamEvents.Add(teamEvent);
        try
        {
            await _context.SaveChangesAsync();
            return teamEvent;
        }
        catch (DbUpdateException ex) when (ex is not DbUpdateConcurrencyException)
        {
            // The foreign key to the event type failed: the type was removed after the service checked it.
            _context.ChangeTracker.Clear();
            return null;
        }
    }

    public async Task<bool> EventTypeExistsAsync(int teamId, int typeId)
    {
        return await _context.TeamEventTypes.AnyAsync(t => t.Id == typeId && t.TeamId == teamId);
    }

    public async Task<TeamOffDay?> GetOverlappingOffDayAsync(int teamId, DateTime start, DateTime end)
    {
        return await _context.TeamOffDays
            .AsNoTracking()
            .Where(d => d.TeamId == teamId && d.StartTime < end && d.EndTime > start)
            .OrderBy(d => d.StartTime)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> UpdateAsync(TeamEvent teamEvent, int expectedVersion)
    {
        // The WHERE clause checks the version the user started from, not the one loaded by this request,
        // so changes saved between opening the editor and pressing Save are caught too.
        _context.Entry(teamEvent).Property(e => e.Version).OriginalValue = expectedVersion;
        teamEvent.Version = expectedVersion + 1;
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // The UPDATE matched no row (someone changed or deleted the event meanwhile), or the new
            // event type was removed after the service checked it.
            _context.Entry(teamEvent).State = EntityState.Detached;
            return false;
        }
    }

    public async Task<bool> DeleteAsync(int teamId, int eventId)
    {
        var deleted = await _context.TeamEvents
            .Where(e => e.Id == eventId && e.TeamId == teamId)
            .ExecuteDeleteAsync();

        return deleted == 1;
    }
}
