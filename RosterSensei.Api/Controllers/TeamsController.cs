using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public class TeamsController : ApiControllerBase
{
    private readonly ITeamService _teamService;

    public TeamsController(ITeamService teamService)
    {
        _teamService = teamService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamDto dto)
        => ToActionResult(await _teamService.CreateTeamAsync(UserId, dto));

    [HttpGet("my-teams")]
    public async Task<IActionResult> GetMyTeams()
        => Ok(await _teamService.GetUserTeamsAsync(UserId));

    [HttpPost("{teamId}/members")]
    public async Task<IActionResult> AddMember(int teamId, [FromBody] AddTeamMemberDto dto)
        => ToMessageResult(await _teamService.InviteMemberAsync(teamId, UserId, dto.UserEmail));

    [HttpDelete("{teamId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(int teamId, string memberId)
        => ToMessageResult(await _teamService.RemoveMemberAsync(teamId, UserId, memberId));

    [HttpPost("{teamId}/leave")]
    public async Task<IActionResult> LeaveTeam(int teamId)
        => ToMessageResult(await _teamService.LeaveTeamAsync(teamId, UserId));

    [HttpDelete("{teamId}")]
    public async Task<IActionResult> DeleteTeam(int teamId)
        => ToMessageResult(await _teamService.DeleteTeamAsync(teamId, UserId));

    [HttpGet("{teamId}/dashboard")]
    public async Task<IActionResult> GetTeamDashboard(int teamId)
        => ToActionResult(await _teamService.GetTeamDashboardAsync(teamId, UserId));

    [HttpGet("{teamId}/members")]
    public async Task<IActionResult> GetTeamMembers(int teamId)
        => ToActionResult(await _teamService.GetTeamMembersAsync(teamId, UserId));

    [HttpPut("{teamId}/members/{memberId}/role")]
    public async Task<IActionResult> ChangeMemberRole(int teamId, string memberId, [FromBody] ChangeRoleDto dto)
        => ToMessageResult(await _teamService.ChangeMemberRoleAsync(teamId, UserId, memberId, dto.NewRole));

    [HttpPut("{teamId}/transfer-ownership")]
    public async Task<IActionResult> TransferOwnership(int teamId, [FromBody] TransferOwnershipDto dto)
        => ToMessageResult(await _teamService.TransferOwnershipAsync(teamId, UserId, dto.NewOwnerId));

    [HttpGet("my-invites")]
    public async Task<IActionResult> GetMyPendingInvites()
        => Ok(await _teamService.GetMyPendingInvitesAsync(UserId));

    [HttpPost("invites/{inviteId}/respond")]
    public async Task<IActionResult> RespondToInvite(int inviteId, [FromBody] bool isAccepted)
        => ToMessageResult(await _teamService.RespondToInviteAsync(inviteId, UserId, isAccepted));
}
