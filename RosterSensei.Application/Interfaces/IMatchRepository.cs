using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Interfaces;

public interface IMatchRepository
{
    Task<Match> AddAsync(Match match);
    Task<List<Match>> GetMatchesByTeamIdAsync(int teamId, CancellationToken cancellationToken = default);

    // Played maps of finished matches, grouped by map in the database. WinRatePercentage is left at 0.
    Task<List<MapStatsDto>> GetMapStatsAsync(int teamId, MatchKind? type, CancellationToken cancellationToken = default);
}
