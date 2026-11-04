using CS2TeamManager.Application.DTOs;
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
            .Include(m => m.Maps)
            .Where(m => m.TeamId == teamId)
            .OrderByDescending(m => m.ScheduledDate)
            .ToListAsync();
    }

    public async Task<List<MapStatsDto>> GetMapStatsAsync(int teamId, MatchKind? type)
    {
        var maps = _context.MatchMaps.Where(mm =>
            mm.Match.TeamId == teamId
            && mm.Match.Status == MatchStatus.Finished
            && mm.OurScore != null
            && mm.OpponentScore != null);

        if (type.HasValue)
            maps = maps.Where(mm => mm.Match.Type == type.Value);

        return await maps
            .GroupBy(mm => mm.MapName)
            .Select(g => new MapStatsDto
            {
                MapName = g.Key,
                Played = g.Count(),
                Wins = g.Count(mm => mm.OurScore > mm.OpponentScore),
                Losses = g.Count(mm => mm.OurScore < mm.OpponentScore),
                Draws = g.Count(mm => mm.OurScore == mm.OpponentScore),
                RoundsWon = g.Sum(mm => mm.OurScore!.Value),
                RoundsLost = g.Sum(mm => mm.OpponentScore!.Value)
            })
            .ToListAsync();
    }
}
