using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;

namespace CS2TeamManager.Application.Interfaces;

public interface ITeamService
{
    Task<(bool Success, string ErrorMessage, TeamDto? Data)> CreateTeamAsync(string userId, CreateTeamDto dto);
    Task<List<TeamDto>> GetUserTeamsAsync(string userId);
    Task<Result<string>> AddMemberAsync(int teamId, string ownerId, string memberEmail);
    Task<Result<string>> RemoveMemberAsync(int teamId, string ownerId, string memberIdToRemove);
    Task<TeamDashboardDto?> GetTeamDashboardAsync(int teamId, string userId);
    Task<List<TeamMemberDto>> GetTeamMembersAsync(int teamId);

    Task<Result<string>> ChangeMemberRoleAsync(int teamId, string currentUserId, string targetMemberId, string newRoleStr);

}
