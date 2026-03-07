using CS2TeamManager.Domain.Entities;

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
}
