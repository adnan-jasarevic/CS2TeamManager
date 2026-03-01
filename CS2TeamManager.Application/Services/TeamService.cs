using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Application.Services;

public class TeamService : ITeamService
{
    private readonly ITeamRepository _teamRepo;

    public TeamService(ITeamRepository teamRepo)
    {
        _teamRepo = teamRepo;
    }

    public async Task<(bool Success, string ErrorMessage, TeamDto? Data)> CreateTeamAsync(string userId, CreateTeamDto dto)
    {
        int ownedCount = await _teamRepo.GetOwnedTeamsCountAsync(userId);
        if (ownedCount >= 3)
            return (false, "You cannot own more than 3 teams.", null);

        // Team Creation
        var newTeam = new Team
        {
            Name = dto.Name,
            CreatedAt = DateTime.UtcNow
        };

        // Automatically add creator as Owner
        newTeam.Members.Add(new TeamMember
        {
            UserId = userId,
            Role = TeamRole.Owner,
            JoinedAt = DateTime.UtcNow
        });

        var savedTeam = await _teamRepo.AddAsync(newTeam);

        var teamDto = new TeamDto
        {
            Id = savedTeam.Id,
            Name = savedTeam.Name,
            CreatedAt = savedTeam.CreatedAt,
            CurrentUserRole = "Owner"
        };

        return (true, string.Empty, teamDto);
    }

    public async Task<List<TeamDto>> GetUserTeamsAsync(string userId)
    {
        var teams = await _teamRepo.GetTeamsByUserIdAsync(userId);

        return teams.Select(t => new TeamDto
        {
            Id = t.Id,
            Name = t.Name,
            CreatedAt = t.CreatedAt,
            CurrentUserRole = t.Members.First(m => m.UserId == userId).Role.ToString()
        }).ToList();
    }
}
