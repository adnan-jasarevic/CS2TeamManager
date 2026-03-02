using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CS2TeamManager.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MatchesController : ControllerBase
{
    private readonly IMatchService _matchService;

    public MatchesController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    // POST: /api/Matches/{teamId}
    [HttpPost("{teamId}")]
    public async Task<IActionResult> AddMatch(int teamId, [FromBody] CreateMatchDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID is not found in the token.");

        var result = await _matchService.AddMatchAsync(userId, teamId, dto);

        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(result.Data);
    }

    // GET: /api/Matches/{teamId}
    [HttpGet("{teamId}")]
    public async Task<IActionResult> GetTeamMatches(int teamId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("Korisnički ID nije pronađen u tokenu.");

        var result = await _matchService.GetTeamMatchesAsync(userId, teamId);

        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(result.Data);
    }
}
