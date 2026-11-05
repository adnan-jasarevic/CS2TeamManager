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

    public async Task<List<TeamEvent>> GetEventsAsync(int teamId, DateTime from, DateTime to)
    {
        return await _context.TeamEvents
            .Where(e => e.TeamId == teamId && e.StartTime < to && e.EndTime > from)
            .OrderBy(e => e.StartTime)
            .ToListAsync();
    }

    public async Task<TeamEvent?> GetByIdAsync(int teamId, int eventId)
    {
        return await _context.TeamEvents.FirstOrDefaultAsync(e => e.Id == eventId && e.TeamId == teamId);
    }

    public async Task<TeamEvent> AddAsync(TeamEvent teamEvent)
    {
        _context.TeamEvents.Add(teamEvent);
        await _context.SaveChangesAsync();
        return teamEvent;
    }

    public async Task<bool> UpdateAsync(TeamEvent teamEvent)
    {
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            // The UPDATE matched no row: someone deleted the event while it was being edited.
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
