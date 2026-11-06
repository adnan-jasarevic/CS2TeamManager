using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Controllers;

[Authorize]
[Route("api/teams/{teamId}/event-types")]
public class EventTypesController : ApiControllerBase
{
    private readonly ITeamEventTypeService _typeService;

    public EventTypesController(ITeamEventTypeService typeService)
    {
        _typeService = typeService;
    }

    // GET: /api/teams/{teamId}/event-types
    [HttpGet]
    public async Task<IActionResult> GetEventTypes(int teamId, CancellationToken cancellationToken)
        => ToActionResult(await _typeService.GetAsync(UserId, teamId, cancellationToken));

    // POST: /api/teams/{teamId}/event-types
    [HttpPost]
    public async Task<IActionResult> CreateEventType(int teamId, [FromBody] SaveTeamEventTypeDto dto)
        => ToActionResult(await _typeService.CreateCustomAsync(UserId, teamId, dto));

    // POST: /api/teams/{teamId}/event-types/presets/{preset}
    [HttpPost("presets/{preset}")]
    public async Task<IActionResult> AddPreset(int teamId, string preset)
        => ToActionResult(await _typeService.AddPresetAsync(UserId, teamId, preset));

    // PUT: /api/teams/{teamId}/event-types/{typeId}
    [HttpPut("{typeId:int}")]
    public async Task<IActionResult> UpdateEventType(int teamId, int typeId, [FromBody] SaveTeamEventTypeDto dto)
        => ToActionResult(await _typeService.UpdateAsync(UserId, teamId, typeId, dto));

    // DELETE: /api/teams/{teamId}/event-types/{typeId}
    [HttpDelete("{typeId:int}")]
    public async Task<IActionResult> DeleteEventType(int teamId, int typeId)
        => ToMessageResult(await _typeService.DeleteAsync(UserId, teamId, typeId));

    // DELETE: /api/teams/{teamId}/event-types (every type except "Other")
    [HttpDelete]
    public async Task<IActionResult> DeleteAllEventTypes(int teamId)
        => ToMessageResult(await _typeService.DeleteAllAsync(UserId, teamId));
}
