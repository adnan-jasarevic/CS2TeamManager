using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CS2TeamManager.Api.Controllers;

[Authorize] // all endpoints need a jwt token
[ApiController]
[Route("api/[controller]")]
public class TeamsController : ControllerBase
{
    private readonly ITeamService _teamService;

    public TeamsController(ITeamService teamService)
    {
        _teamService = teamService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID not found in token.");

        var result = await _teamService.CreateTeamAsync(userId, dto);

        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(result.Data);
    }

    [HttpGet("my-teams")]
    public async Task<IActionResult> GetMyTeams()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID not found in token.");

        var teams = await _teamService.GetUserTeamsAsync(userId);

        return Ok(teams);
    }

    [HttpPost("{teamId}/members")]
    public async Task<IActionResult> AddMember(int teamId, [FromBody] AddTeamMemberDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _teamService.AddMemberAsync(teamId, userId, dto.UserEmail);

        if (!result.Success) return BadRequest(new { message = result.ErrorMessage });
        return Ok(new { message = result.Data });
    }

    [HttpDelete("{teamId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(int teamId, string memberId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _teamService.RemoveMemberAsync(teamId, userId, memberId);

        if (!result.Success) return BadRequest(new { message = result.ErrorMessage });
        return Ok(new { message = result.Data });
    }

    [HttpGet("{teamId}/dashboard")]
    public async Task<IActionResult> GetTeamDashboard(int teamId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID not found in token.");

        var dashboardData = await _teamService.GetTeamDashboardAsync(teamId, userId);

        if (dashboardData == null)
            return Forbid("You do not have access to this team's dashboard.");

        return Ok(dashboardData);
    }

    [HttpGet("{teamId}/members")]
    public async Task<IActionResult> GetTeamMembers(int teamId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var members = await _teamService.GetTeamMembersAsync(teamId);

        return Ok(members);
    }
}