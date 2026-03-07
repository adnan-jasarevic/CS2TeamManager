using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;
using Microsoft.AspNetCore.Identity;


namespace CS2TeamManager.Application.Services;

public class TeamService : ITeamService
{
    private readonly ITeamRepository _teamRepository;
    private readonly IIdentityService _identityService;

    public TeamService(ITeamRepository teamRepository, IIdentityService identityService)
    {
        _teamRepository = teamRepository;
        _identityService = identityService;
    }

    public async Task<(bool Success, string ErrorMessage, TeamDto? Data)> CreateTeamAsync(string userId, CreateTeamDto dto)
    {
        int ownedCount = await _teamRepository.GetOwnedTeamsCountAsync(userId);
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

        var savedTeam = await _teamRepository.AddAsync(newTeam);

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
        var teams = await _teamRepository.GetTeamsByUserIdAsync(userId);

        return teams.Select(t => new TeamDto
        {
            Id = t.Id,
            Name = t.Name,
            CreatedAt = t.CreatedAt,
            CurrentUserRole = t.Members.First(m => m.UserId == userId).Role.ToString()
        }).ToList();
    }

    public async Task<Result<string>> AddMemberAsync(int teamId, string ownerId, string memberEmail)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null) return Result<string>.Failure("The team doesn't exist.");

        var ownerMembership = team.Members.FirstOrDefault(m => m.UserId == ownerId);
        if (ownerMembership == null || ownerMembership.Role != Domain.Enums.TeamRole.Owner)
            return Result<string>.Failure("Only the Owner can add players.");

        var userResult = await _identityService.CheckUserExistsAndGetIdAsync(memberEmail);
        if (!userResult.Exists)
            return Result<string>.Failure("A user with that Email doesn't exist.");

        if (team.Members.Any(m => m.UserId == userResult.UserId))
            return Result<string>.Failure("The user is already in a team.");

        team.Members.Add(new TeamMember
        {
            UserId = userResult.UserId, // We get it through IdentityService
            TeamId = team.Id,
            Role = Domain.Enums.TeamRole.Player,
            JoinedAt = DateTime.UtcNow
        });

        await _teamRepository.UpdateAsync(team);
        return Result<string>.SuccessResult("The user has successfully been added to the team.");
    }

    public async Task<Result<string>> RemoveMemberAsync(int teamId, string ownerId, string memberIdToRemove)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null) return Result<string>.Failure("The team doesn't exist.");

        // the owner removes a diff user, or the user leaves the team by themselves
        var requesterMembership = team.Members.FirstOrDefault(m => m.UserId == ownerId);
        if (requesterMembership == null) return Result<string>.Failure("You are not in this team.");

        // prevent the player from removing other players (only owner can, or themselves)
        if (requesterMembership.Role != Domain.Enums.TeamRole.Owner && ownerId != memberIdToRemove)
            return Result<string>.Failure("Only the Team Owner can remove other players.");

        var memberToRemove = team.Members.FirstOrDefault(m => m.UserId == memberIdToRemove);
        if (memberToRemove == null) return Result<string>.Failure("The User is not in the team.");

        if (memberToRemove.Role == Domain.Enums.TeamRole.Owner)
            return Result<string>.Failure("The Owner cannot be removed. They have to delete the team.");

        team.Members.Remove(memberToRemove);
        await _teamRepository.UpdateAsync(team);

        return Result<string>.SuccessResult("The User has been successfully removed from the team.");
    }


    public async Task<TeamDashboardDto?> GetTeamDashboardAsync(int teamId, string userId)
    {
        var isMember = await _teamRepository.IsUserInTeamAsync(teamId, userId);
        if (!isMember) return null;

        var totalMembers = await _teamRepository.GetTeamMemberCountAsync(teamId);

        var allMatches = await _teamRepository.GetTeamMatchesAsync(teamId);

        var dashboard = new TeamDashboardDto
        {
            TotalMembers = totalMembers,
            TotalMatches = allMatches.Count(m => m.Status == MatchStatus.Finished)
        };

        var finishedMatches = allMatches.Where(m => m.Status == MatchStatus.Finished).ToList();
        var wins = finishedMatches.Count(m => m.OurScore > m.OpponentScore);

        if (finishedMatches.Any())
        {
            dashboard.WinRatePercentage = (int)Math.Round((double)wins / finishedMatches.Count * 100);
        }
        else
        {
            dashboard.WinRatePercentage = 0;
        }

        var upcoming = allMatches
            .Where(m => m.Status == MatchStatus.Scheduled && m.ScheduledDate > DateTime.UtcNow)
            .OrderBy(m => m.ScheduledDate)
            .Take(5)
            .ToList();

        dashboard.UpcomingMatchesCount = upcoming.Count;
        dashboard.UpcomingMatches = upcoming.Select(m => new MatchResponseDto
        {
            Id = m.Id,
            OpponentName = m.OpponentName,
            ScheduledDate = m.ScheduledDate,
            Status = m.Status.ToString()
        }).ToList();

        var recent = finishedMatches
            .OrderByDescending(m => m.ScheduledDate)
            .Take(5)
            .ToList();

        dashboard.RecentMatches = recent.Select(m => new MatchResponseDto
        {
            Id = m.Id,
            OpponentName = m.OpponentName,
            ScheduledDate = m.ScheduledDate,
            Status = m.Status.ToString(),
            FinalScore = $"{m.OurScore}-{m.OpponentScore}",
            MatchOutcome = m.OurScore > m.OpponentScore ? "WIN" : (m.OurScore < m.OpponentScore ? "LOSS" : "DRAW")
        }).ToList();

        return dashboard;
    }

    public async Task<List<TeamMemberDto>> GetTeamMembersAsync(int teamId)
    {
        var membersData = await _teamRepository.GetTeamMembersWithUserDetailsAsync(teamId);

        var dtoList = membersData.Select(data => new TeamMemberDto
        {
            Id = data.Member.UserId,
            Email = data.Email ?? "Unknown",
            Username = data.Username ?? "Unknown",
            Role = data.Member.Role.ToString(),
            JoinedAt = data.Member.JoinedAt
        }).ToList();

        return dtoList;
    }

}