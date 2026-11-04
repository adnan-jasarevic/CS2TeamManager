using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CS2TeamManager.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/teams/{teamId}/events")]
public class EventsController : ControllerBase
{
    private readonly ITeamEventService _eventService;

    public EventsController(ITeamEventService eventService)
    {
        _eventService = eventService;
    }

    // GET: /api/teams/{teamId}/events?from=...&to=...
    [HttpGet]
    public async Task<IActionResult> GetEvents(int teamId, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID is not found in the token.");

        var result = await _eventService.GetEventsAsync(userId, teamId, from.ToUniversalTime(), to.ToUniversalTime());
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(result.Data);
    }

    // POST: /api/teams/{teamId}/events
    [HttpPost]
    public async Task<IActionResult> CreateEvent(int teamId, [FromBody] SaveTeamEventDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID is not found in the token.");

        var result = await _eventService.CreateEventAsync(userId, teamId, dto);
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(result.Data);
    }

    // PUT: /api/teams/{teamId}/events/{eventId}
    [HttpPut("{eventId}")]
    public async Task<IActionResult> UpdateEvent(int teamId, int eventId, [FromBody] SaveTeamEventDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID is not found in the token.");

        var result = await _eventService.UpdateEventAsync(userId, teamId, eventId, dto);
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(result.Data);
    }

    // DELETE: /api/teams/{teamId}/events/{eventId}
    [HttpDelete("{eventId}")]
    public async Task<IActionResult> DeleteEvent(int teamId, int eventId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User ID is not found in the token.");

        var result = await _eventService.DeleteEventAsync(userId, teamId, eventId);
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(new { message = result.Data });
    }
}
