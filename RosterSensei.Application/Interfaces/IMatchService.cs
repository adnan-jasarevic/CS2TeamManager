using RosterSensei.Domain.Entities;
using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface IMatchService
{
    Task<Result<MatchDto>> AddMatchAsync(string userId, int teamId, CreateMatchDto dto);
    Task<Result<List<MatchDto>>> GetTeamMatchesAsync(string userId, int teamId);
    Task<Result<TeamStatsDto>> GetTeamStatsAsync(string userId, int teamId, MatchKind? type);
}
