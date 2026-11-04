using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Application.Interfaces;

public interface IMatchRepository
{
    Task<Match> AddAsync(Match match);
    Task<List<Match>> GetMatchesByTeamIdAsync(int teamId);

    // Played maps of finished matches, grouped by map in the database. WinRatePercentage is left at 0.
    Task<List<MapStatsDto>> GetMapStatsAsync(int teamId, MatchKind? type);
}
