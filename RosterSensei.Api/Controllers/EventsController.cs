using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Controllers;

[Authorize]
[Route("api/teams/{teamId}/events")]
public class EventsController : ApiControllerBase
{
    private readonly ITeamEventService _eventService;

    public EventsController(ITeamEventService eventService)
    {
        _eventService = eventService;
    }

    // GET: /api/teams/{teamId}/events?from=...&to=...
    [HttpGet]
    public async Task<IActionResult> GetEvents(int teamId, [FromQuery] DateTime from, [FromQuery] DateTime to)
        => ToActionResult(await _eventService.GetEventsAsync(UserId, teamId, from.ToUniversalTime(), to.ToUniversalTime()));

    // POST: /api/teams/{teamId}/events
    [HttpPost]
    public async Task<IActionResult> CreateEvent(int teamId, [FromBody] SaveTeamEventDto dto)
        => ToActionResult(await _eventService.CreateEventAsync(UserId, teamId, dto));

    // PUT: /api/teams/{teamId}/events/{eventId}
    [HttpPut("{eventId}")]
    public async Task<IActionResult> UpdateEvent(int teamId, int eventId, [FromBody] SaveTeamEventDto dto)
        => ToActionResult(await _eventService.UpdateEventAsync(UserId, teamId, eventId, dto));

    // DELETE: /api/teams/{teamId}/events/{eventId}
    [HttpDelete("{eventId}")]
    public async Task<IActionResult> DeleteEvent(int teamId, int eventId)
        => ToMessageResult(await _eventService.DeleteEventAsync(UserId, teamId, eventId));
}
