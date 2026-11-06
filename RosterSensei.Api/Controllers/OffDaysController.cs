using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Controllers;

[Authorize]
[Route("api/teams/{teamId}/off-days")]
public class OffDaysController : ApiControllerBase
{
    private readonly ITeamOffDayService _offDayService;

    public OffDaysController(ITeamOffDayService offDayService)
    {
        _offDayService = offDayService;
    }

    // GET: /api/teams/{teamId}/off-days?from=...&to=...
    [HttpGet]
    public async Task<IActionResult> GetOffDays(int teamId, [FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken cancellationToken)
        => ToActionResult(await _offDayService.GetAsync(UserId, teamId, from.ToUniversalTime(), to.ToUniversalTime(), cancellationToken));

    // PUT: /api/teams/{teamId}/off-days/2026-11-20
    [HttpPut("{date}")]
    public async Task<IActionResult> MarkOffDay(int teamId, DateOnly date, [FromBody] SaveTeamOffDayDto dto)
        => ToActionResult(await _offDayService.MarkAsync(UserId, teamId, date, dto));

    // DELETE: /api/teams/{teamId}/off-days/2026-11-20
    [HttpDelete("{date}")]
    public async Task<IActionResult> UnmarkOffDay(int teamId, DateOnly date)
        => ToMessageResult(await _offDayService.UnmarkAsync(UserId, teamId, date));
}
