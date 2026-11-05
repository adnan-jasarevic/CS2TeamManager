using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Application.Interfaces;

public interface ITeamRepository
{
    Task<Team?> GetByIdAsync(int id);
    Task<List<Team>> GetTeamsByUserIdAsync(string userId);

    // Saves a new team owned by team.OwnerId unless they already own maxOwnedTeams.
    // The count and the insert run in one serializable transaction, so two requests at once can't both get past the limit.
    // Rejected: the limit is reached. Conflict: a concurrent request for the same user won.
    Task<WriteOutcome> AddOwnedTeamAsync(Team team, int maxOwnedTeams);

    Task<bool> IsUserInTeamAsync(int teamId, string userId);
    Task<int> GetTeamMemberCountAsync(int teamId);
    Task<List<Match>> GetTeamMatchesAsync(int teamId);
    Task<List<(TeamMember Member, string Email, string Username)>> GetTeamMembersWithUserDetailsAsync(int teamId);
    Task<TeamMember?> GetTeamMemberAsync(int teamId, string userId);

    // Sets a member's role, only while ownerId still owns the team.
    // Rejected: the team already has a Captain. Conflict: ownership changed or the member left meanwhile.
    Task<WriteOutcome> ChangeMemberRoleAsync(int teamId, string ownerId, string memberId, TeamRole newRole);

    // Makes an Officer the Owner, unless they already own maxOwnedTeams.
    // Rejected: the limit is reached. Conflict: the Owner or the Officer's role changed meanwhile.
    Task<WriteOutcome> TransferOwnershipAsync(int teamId, string currentOwnerId, string newOwnerId, int maxOwnedTeams);

    // Removes a member who doesn't own the team, when requesterId is the team's Owner or the member themselves.
    // Checked in the delete itself, so a concurrent ownership change can't slip through. Returns false if nothing was removed.
    Task<bool> RemoveMemberAsync(int teamId, string memberId, string requesterId);

    // Deletes the team with its matches, events, members and invites in one transaction.
    // Returns false if ownerId no longer owns the team.
    Task<bool> DeleteTeamAsync(int teamId, string ownerId);

    Task<TeamInvite?> GetPendingInviteAsync(int teamId, string email);

    // Returns false when the user already has a pending invite to this team.
    Task<bool> CreateInviteAsync(TeamInvite invite);

    Task<List<TeamInvite>> GetUserPendingInvitesAsync(string userId);
    Task<TeamInvite?> GetInviteByIdAsync(int inviteId);
    Task<bool> CompletePendingInviteAsync(int inviteId, InviteStatus newStatus, TeamMember? newMember = null);
}
