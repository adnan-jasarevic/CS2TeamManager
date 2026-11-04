using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CS2TeamManager.Infrastructure.Repositories;

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

    public async Task UpdateAsync(TeamEvent teamEvent)
    {
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(TeamEvent teamEvent)
    {
        _context.TeamEvents.Remove(teamEvent);
        await _context.SaveChangesAsync();
    }
}
