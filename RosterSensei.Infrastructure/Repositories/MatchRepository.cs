using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace RosterSensei.Infrastructure.Repositories;

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

    public async Task<List<Match>> GetMatchesByTeamIdAsync(int teamId, CancellationToken cancellationToken = default)
    {
        return await _context.Matches
            .Include(m => m.Maps)
            .Include(m => m.Participations)
            .AsSplitQuery()
            .Where(m => m.TeamId == teamId)
            .OrderByDescending(m => m.ScheduledDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<LineupWriteOutcome> ReplaceLineupAsync(int teamId, int matchId, List<MatchParticipation> lineup)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Writing the match row (to its own value) takes its row lock until commit, so two
            // replacements of the same lineup run one after the other and can't end in a mix of both.
            // Only the match row is locked, so reading lineups isn't blocked by range locks.
            var locked = await _context.Matches
                .Where(m => m.Id == matchId && m.TeamId == teamId)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.TeamId, m => m.TeamId));
            if (locked == 0)
                return LineupWriteOutcome.MatchNotFound;

            var userIds = lineup.Select(p => p.UserId).Distinct().ToList();
            var allowed = await _context.TeamMembers
                .Where(tm => tm.TeamId == teamId && userIds.Contains(tm.UserId))
                .Select(tm => tm.UserId)
                .Union(_context.Set<MatchParticipation>()
                    .Where(p => p.MatchId == matchId && userIds.Contains(p.UserId))
                    .Select(p => p.UserId))
                .CountAsync();
            if (allowed != userIds.Count)
                return LineupWriteOutcome.NotTeamMembers;

            await _context.Set<MatchParticipation>()
                .Where(p => p.MatchId == matchId)
                .ExecuteDeleteAsync();

            foreach (var player in lineup)
                player.MatchId = matchId;
            _context.Set<MatchParticipation>().AddRange(lineup);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
            return LineupWriteOutcome.Done;
        }
        // A duplicate player (refused by the unique index) or a deadlock: nothing was saved.
        catch (Exception ex) when (ex is DbUpdateException or DbException)
        {
            _context.ChangeTracker.Clear();
            return LineupWriteOutcome.Conflict;
        }
    }

    public async Task<List<MapStatsDto>> GetMapStatsAsync(int teamId, MatchKind? type, CancellationToken cancellationToken = default)
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
            .ToListAsync(cancellationToken);
    }
}
