using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Interfaces;

public enum LineupWriteOutcome
{
    Done,
    MatchNotFound,
    // A player isn't a member of the team (and wasn't already in this lineup).
    NotTeamMembers,
    // The database gave up on the write, e.g. as a deadlock victim. Retrying may work.
    Conflict
}

public interface IMatchRepository
{
    Task<Match> AddAsync(Match match);
    // With maps and lineups.
    Task<List<Match>> GetMatchesByTeamIdAsync(int teamId, CancellationToken cancellationToken = default);

    // Replaces a match's whole lineup in one transaction. Every player must be a member of the team,
    // or already in this lineup (someone who has left since keeps their place in its history).
    Task<LineupWriteOutcome> ReplaceLineupAsync(int teamId, int matchId, List<MatchParticipation> lineup);

    // Played maps of finished matches, grouped by map in the database. WinRatePercentage is left at 0.
    Task<List<MapStatsDto>> GetMapStatsAsync(int teamId, MatchKind? type, CancellationToken cancellationToken = default);
}
