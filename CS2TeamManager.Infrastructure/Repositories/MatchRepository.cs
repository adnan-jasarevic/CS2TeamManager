using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CS2TeamManager.Infrastructure.Repositories;

public class MatchRepository : IMatchRepository
{
    private readonly AppDbContext _context;

    public MatchRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Match> AddAsync(Match match)
    {
        _context.Matches.Add(match);
        await _context.SaveChangesAsync();
        return match;
    }

    public async Task<List<Match>> GetMatchesByTeamIdAsync(int teamId)
    {
        return await _context.Matches
            .Where(m => m.TeamId == teamId)
            .OrderByDescending(m => m.ScheduledDate)
            .ToListAsync();
    }
}
