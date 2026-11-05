using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface ITeamService
{
    Task<Result<TeamDto>> CreateTeamAsync(string userId, CreateTeamDto dto);
    Task<List<TeamDto>> GetUserTeamsAsync(string userId);
    Task<Result<string>> InviteMemberAsync(int teamId, string senderUserId, string targetEmail);

    Task<Result<string>> RemoveMemberAsync(int teamId, string ownerId, string memberIdToRemove);
    Task<Result<string>> LeaveTeamAsync(int teamId, string userId);
    Task<Result<string>> DeleteTeamAsync(int teamId, string userId);
    Task<Result<TeamDashboardDto>> GetTeamDashboardAsync(int teamId, string userId);
    Task<Result<List<TeamMemberDto>>> GetTeamMembersAsync(int teamId, string userId);

    Task<Result<string>> ChangeMemberRoleAsync(int teamId, string currentUserId, string targetMemberId, string newRoleStr);
    Task<Result<string>> TransferOwnershipAsync(int teamId, string currentOwnerId, string newOwnerId);
    Task<List<TeamInviteDto>> GetMyPendingInvitesAsync(string userId);
    Task<Result<string>> RespondToInviteAsync(int inviteId, string userId, bool isAccepted);
}
