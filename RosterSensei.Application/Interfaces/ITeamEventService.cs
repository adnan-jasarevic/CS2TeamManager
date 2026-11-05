using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface ITeamEventService
{
    Task<Result<List<TeamEventDto>>> GetEventsAsync(string userId, int teamId, DateTime from, DateTime to);
    Task<Result<TeamEventDto>> CreateEventAsync(string userId, int teamId, SaveTeamEventDto dto);
    Task<Result<TeamEventDto>> UpdateEventAsync(string userId, int teamId, int eventId, SaveTeamEventDto dto);
    Task<Result<string>> DeleteEventAsync(string userId, int teamId, int eventId);
}
