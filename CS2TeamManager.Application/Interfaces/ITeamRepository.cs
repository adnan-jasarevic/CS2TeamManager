using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Application.Interfaces;

public interface ITeamRepository
{
    Task<Team?> GetByIdAsync(int id);
    Task<List<Team>> GetTeamsByUserIdAsync(string userId);
    Task<int> GetOwnedTeamsCountAsync(string userId);
    Task<Team> AddAsync(Team team);
}
