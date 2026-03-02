using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;

namespace CS2TeamManager.Application.Interfaces;

public interface IMatchService
{
    Task<Result<MatchDto>> AddMatchAsync(string userId, int teamId, CreateMatchDto dto);
    Task<Result<List<MatchDto>>> GetTeamMatchesAsync(string userId, int teamId);
}
