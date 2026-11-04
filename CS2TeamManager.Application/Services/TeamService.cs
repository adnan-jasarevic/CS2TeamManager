using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;


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

    public async Task<Result<TeamDto>> CreateTeamAsync(string userId, CreateTeamDto dto)
    {
        int ownedCount = await _teamRepository.GetOwnedTeamsCountAsync(userId);
        if (ownedCount >= 3)
            return Result<TeamDto>.Failure("You cannot own more than 3 teams.");

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

        return Result<TeamDto>.SuccessResult(teamDto);
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

    public async Task<Result<string>> InviteMemberAsync(int teamId, string senderUserId, string targetEmail)
    {
        var (exists, targetUserId) = await _identityService.CheckUserExistsAndGetIdAsync(targetEmail);
        if (!exists)
            return Result<string>.NotFound("A user with this email does not exist. They must register first.");

        if (senderUserId == targetUserId)
            return Result<string>.Failure("You cannot invite yourself to the team.");

        var sender = await _teamRepository.GetTeamMemberAsync(teamId, senderUserId);
        if (sender == null || !sender.Role.CanManageTeam())
            return Result<string>.Forbidden("Only the team Owner, Captain or Officers can invite new players.");

        var existingMember = await _teamRepository.GetTeamMemberAsync(teamId, targetUserId);
        if (existingMember != null)
            return Result<string>.Failure("This user is already a member of the team.");

        var existingInvite = await _teamRepository.GetPendingInviteAsync(teamId, targetEmail);
        if (existingInvite != null)
            return Result<string>.Failure("An active invite has already been sent to this user.");

        var invite = new TeamInvite
        {
            TeamId = teamId,
            TargetUserEmail = targetEmail,
            TargetUserId = targetUserId,
            SenderUserId = senderUserId,
            Status = InviteStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        await _teamRepository.CreateInviteAsync(invite);

        return Result<string>.SuccessResult("Invite sent successfully.");
    }



    public async Task<Result<string>> RemoveMemberAsync(int teamId, string ownerId, string memberIdToRemove)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null) return Result<string>.NotFound("The team doesn't exist.");

        // the owner removes a diff user, or the user leaves the team by themselves
        var requesterMembership = team.Members.FirstOrDefault(m => m.UserId == ownerId);
        if (requesterMembership == null) return Result<string>.Forbidden("You are not in this team.");

        // prevent the player from removing other players (only owner can, or themselves)
        if (requesterMembership.Role != Domain.Enums.TeamRole.Owner && ownerId != memberIdToRemove)
            return Result<string>.Forbidden("Only the Team Owner can remove other players.");

        var memberToRemove = team.Members.FirstOrDefault(m => m.UserId == memberIdToRemove);
        if (memberToRemove == null) return Result<string>.NotFound("The User is not in the team.");

        if (memberToRemove.Role == Domain.Enums.TeamRole.Owner)
            return Result<string>.Failure("The Owner cannot be removed. They have to delete the team.");

        team.Members.Remove(memberToRemove);
        await _teamRepository.UpdateAsync(team);

        return Result<string>.SuccessResult("The User has been successfully removed from the team.");
    }


    public async Task<Result<TeamDashboardDto>> GetTeamDashboardAsync(int teamId, string userId)
    {
        var isMember = await _teamRepository.IsUserInTeamAsync(teamId, userId);
        if (!isMember)
            return Result<TeamDashboardDto>.Forbidden("You do not have access to this team's dashboard.");

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

        return Result<TeamDashboardDto>.SuccessResult(dashboard);
    }

    public async Task<Result<List<TeamMemberDto>>> GetTeamMembersAsync(int teamId, string userId)
    {
        var isMember = await _teamRepository.IsUserInTeamAsync(teamId, userId);
        if (!isMember)
            return Result<List<TeamMemberDto>>.Forbidden("You are not a member of this team.");

        var membersData = await _teamRepository.GetTeamMembersWithUserDetailsAsync(teamId);

        var dtoList = membersData.Select(data => new TeamMemberDto
        {
            Id = data.Member.UserId,
            Email = data.Email ?? "Unknown",
            Username = data.Username ?? "Unknown",
            Role = data.Member.Role.ToString(),
            JoinedAt = data.Member.JoinedAt
        }).ToList();

        return Result<List<TeamMemberDto>>.SuccessResult(dtoList);
    }

    public async Task<Result<string>> ChangeMemberRoleAsync(int teamId, string currentUserId, string targetMemberId, string newRoleStr)
    {
        var requester = await _teamRepository.GetTeamMemberAsync(teamId, currentUserId);
        if (requester == null || requester.Role != TeamRole.Owner)
            return Result<string>.Forbidden("Only the team owner can change roles.");

        var targetMember = await _teamRepository.GetTeamMemberAsync(teamId, targetMemberId);
        if (targetMember == null)
            return Result<string>.NotFound("Member not found in the team.");

        if (targetMember.Role == TeamRole.Owner)
            return Result<string>.Failure("Cannot change the role of the Owner. Use transfer ownership instead.");

        if (!Enum.TryParse<TeamRole>(newRoleStr, ignoreCase: true, out var newRole) || !Enum.IsDefined(newRole))
            return Result<string>.Failure("Invalid role provided.");

        if (newRole == TeamRole.Owner)
            return Result<string>.Failure("A member cannot be made Owner here. Use transfer ownership instead.");

        if (newRole == TeamRole.Captain && targetMember.Role != TeamRole.Captain)
        {
            var members = await _teamRepository.GetTeamMembersWithUserDetailsAsync(teamId);
            var captain = members.FirstOrDefault(m => m.Member.Role == TeamRole.Captain);
            if (captain.Member != null)
                return Result<string>.Failure($"This team already has a Captain ({captain.Username}). Change their role first.");
        }

        targetMember.Role = newRole;
        await _teamRepository.UpdateTeamMemberAsync(targetMember);

        return Result<string>.SuccessResult("Role updated successfully.");
    }

    public async Task<Result<string>> TransferOwnershipAsync(int teamId, string currentOwnerId, string newOwnerId)
    {
        var currentOwner = await _teamRepository.GetTeamMemberAsync(teamId, currentOwnerId);
        if (currentOwner == null || currentOwner.Role != TeamRole.Owner)
            return Result<string>.Forbidden("Only the team owner can transfer ownership.");

        if (currentOwnerId == newOwnerId)
            return Result<string>.Failure("You already own this team.");

        var newOwner = await _teamRepository.GetTeamMemberAsync(teamId, newOwnerId);
        if (newOwner == null)
            return Result<string>.NotFound("Member not found in the team.");

        if (newOwner.Role != TeamRole.Officer)
            return Result<string>.Failure("Ownership can only be transferred to an Officer. Make them an Officer first.");

        int ownedCount = await _teamRepository.GetOwnedTeamsCountAsync(newOwnerId);
        if (ownedCount >= 3)
            return Result<string>.Failure("This member already owns 3 teams and cannot take ownership of another.");

        // The two swap places: the old Owner stays on as an Officer.
        newOwner.Role = TeamRole.Owner;
        currentOwner.Role = TeamRole.Officer;

        // Single save so the team is never left with zero or two owners.
        await _teamRepository.UpdateTeamMembersAsync(new[] { newOwner, currentOwner });

        return Result<string>.SuccessResult("Ownership transferred successfully.");
    }

    public async Task<List<TeamInviteDto>> GetMyPendingInvitesAsync(string userId)
    {
        var invites = await _teamRepository.GetUserPendingInvitesAsync(userId);
        var dtoList = new List<TeamInviteDto>();

        foreach (var invite in invites)
        {
            string senderName = await _identityService.GetUsernameByIdAsync(invite.SenderUserId);

            dtoList.Add(new TeamInviteDto
            {
                InviteId = invite.Id,
                TeamId = invite.TeamId,
                TeamName = invite.Team?.Name ?? "Unknown Team",
                SenderUsername = senderName,
                CreatedAt = invite.CreatedAt
            });
        }

        return dtoList;
    }

    public async Task<Result<string>> RespondToInviteAsync(int inviteId, string userId, bool isAccepted)
    {
        var invite = await _teamRepository.GetInviteByIdAsync(inviteId);

        if (invite == null)
            return Result<string>.NotFound("Invite not found.");

        if (invite.TargetUserId != userId)
            return Result<string>.Forbidden("You are not authorized to respond to this invite.");

        if (invite.Status != InviteStatus.Pending)
            return Result<string>.Failure("This invite has already been responded to.");

        if (!isAccepted)
        {
            if (!await _teamRepository.CompletePendingInviteAsync(inviteId, InviteStatus.Declined))
                return Result<string>.Failure("This invite has already been responded to.");

            return Result<string>.SuccessResult("Invite declined successfully.");
        }

        if (await _teamRepository.IsUserInTeamAsync(invite.TeamId, userId))
        {
            await _teamRepository.CompletePendingInviteAsync(inviteId, InviteStatus.Canceled);
            return Result<string>.Failure("You are already a member of this team.");
        }

        var newMember = new TeamMember
        {
            TeamId = invite.TeamId,
            UserId = userId,
            Role = TeamRole.Player,
            JoinedAt = DateTime.UtcNow
        };

        if (!await _teamRepository.CompletePendingInviteAsync(inviteId, InviteStatus.Accepted, newMember))
            return Result<string>.Failure("This invite has already been responded to.");

        return Result<string>.SuccessResult("Welcome to the team!");
    }


}