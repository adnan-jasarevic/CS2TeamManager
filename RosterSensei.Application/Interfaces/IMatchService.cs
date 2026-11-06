using RosterSensei.Domain.Entities;
using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface IMatchService
{
    Task<Result<MatchDto>> AddMatchAsync(string userId, int teamId, CreateMatchDto dto);
    Task<Result<List<MatchDto>>> GetTeamMatchesAsync(string userId, int teamId, CancellationToken cancellationToken = default);
    Task<Result<List<MatchLineupEntryDto>>> SetLineupAsync(string userId, int teamId, int matchId, SetMatchLineupDto dto);
    Task<Result<TeamStatsDto>> GetTeamStatsAsync(string userId, int teamId, MatchKind? type, CancellationToken cancellationToken = default);
}
