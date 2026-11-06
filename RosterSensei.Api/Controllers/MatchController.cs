using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
public class MatchesController : ApiControllerBase
{
    private readonly IMatchService _matchService;

    public MatchesController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    // POST: /api/Matches/{teamId}
    [HttpPost("{teamId}")]
    public async Task<IActionResult> AddMatch(int teamId, [FromBody] CreateMatchDto dto)
        => ToActionResult(await _matchService.AddMatchAsync(UserId, teamId, dto));

    // GET: /api/Matches/{teamId}
    [HttpGet("{teamId}")]
    public async Task<IActionResult> GetTeamMatches(int teamId, CancellationToken cancellationToken)
        => ToActionResult(await _matchService.GetTeamMatchesAsync(UserId, teamId, cancellationToken));

    // PUT: /api/Matches/{teamId}/{matchId}/lineup
    [HttpPut("{teamId}/{matchId}/lineup")]
    public async Task<IActionResult> SetLineup(int teamId, int matchId, [FromBody] SetMatchLineupDto dto)
        => ToActionResult(await _matchService.SetLineupAsync(UserId, teamId, matchId, dto));

    // GET: /api/Matches/{teamId}/stats?type=Scrim
    [HttpGet("{teamId}/stats")]
    public async Task<IActionResult> GetTeamStats(int teamId, [FromQuery] MatchKind? type, CancellationToken cancellationToken)
        => ToActionResult(await _matchService.GetTeamStatsAsync(UserId, teamId, type, cancellationToken));
}
