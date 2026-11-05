using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Application.Interfaces;

public interface ITeamRepository
{
    Task<Team?> GetByIdAsync(int id);
    Task<List<Team>> GetTeamsByUserIdAsync(string userId);
    Task<int> GetOwnedTeamsCountAsync(string userId);
    Task<Team> AddAsync(Team team);
    Task UpdateAsync(Team team);
    Task<bool> IsUserInTeamAsync(int teamId, string userId);
    Task<int> GetTeamMemberCountAsync(int teamId);
    Task<List<Match>> GetTeamMatchesAsync(int teamId);
    Task<List<(TeamMember Member, string Email, string Username)>> GetTeamMembersWithUserDetailsAsync(int teamId);
    Task<TeamMember?> GetTeamMemberAsync(int teamId, string userId);
    // Returns false when the database rejects the change (for example a second Captain added at the same time).
    Task<bool> UpdateTeamMemberAsync(TeamMember member);

    // Makes an Officer the Owner. Returns false if the Owner or the Officer's role changed meanwhile.
    Task<bool> TransferOwnershipAsync(int teamId, string currentOwnerId, string newOwnerId);

    // Removes a member who doesn't own the team. Returns false if they aren't a member or own the team.
    Task<bool> RemoveNonOwnerMemberAsync(int teamId, string userId);

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
