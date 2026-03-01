using CS2TeamManager.Application.DTOs;

namespace CS2TeamManager.Application.Interfaces;

public interface ITeamService
{
    Task<(bool Success, string ErrorMessage, TeamDto? Data)> CreateTeamAsync(string userId, CreateTeamDto dto);
    Task<List<TeamDto>> GetUserTeamsAsync(string userId);
}
