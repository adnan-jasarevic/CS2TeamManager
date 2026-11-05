using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;

namespace RosterSensei.Application.Services;

public class TeamEventService : ITeamEventService
{
    // Keeps a single request from pulling years of events at once.
    private static readonly TimeSpan MaxRange = TimeSpan.FromDays(400);

    private readonly ITeamEventRepository _eventRepository;
    private readonly ITeamRepository _teamRepository;

    public TeamEventService(ITeamEventRepository eventRepository, ITeamRepository teamRepository)
    {
        _eventRepository = eventRepository;
        _teamRepository = teamRepository;
    }

    public async Task<Result<List<TeamEventDto>>> GetEventsAsync(string userId, int teamId, DateTime from, DateTime to)
    {
        if (to <= from)
            return Result<List<TeamEventDto>>.Failure("The end of the range must be after its start.");
        if (to - from > MaxRange)
            return Result<List<TeamEventDto>>.Failure("The date range is too long.");

        if (await _teamRepository.GetTeamMemberAsync(teamId, userId) == null)
            return Result<List<TeamEventDto>>.Forbidden("You don't have access to the calendar of this team.");

        var events = await _eventRepository.GetEventsAsync(teamId, from, to);
        return Result<List<TeamEventDto>>.SuccessResult(events.Select(ToDto).ToList());
    }

    public async Task<Result<TeamEventDto>> CreateEventAsync(string userId, int teamId, SaveTeamEventDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventDto>.Forbidden("Only the team Owner, Captain or Officers can add events.");

        var teamEvent = new TeamEvent
        {
            TeamId = teamId,
            CreatedByUserId = userId
        };
        Apply(teamEvent, dto);

        var saved = await _eventRepository.AddAsync(teamEvent);
        return Result<TeamEventDto>.SuccessResult(ToDto(saved));
    }

    public async Task<Result<TeamEventDto>> UpdateEventAsync(string userId, int teamId, int eventId, SaveTeamEventDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventDto>.Forbidden("Only the team Owner, Captain or Officers can edit events.");

        var teamEvent = await _eventRepository.GetByIdAsync(teamId, eventId);
        if (teamEvent == null)
            return Result<TeamEventDto>.NotFound("Event was not found.");

        Apply(teamEvent, dto);
        if (!await _eventRepository.UpdateAsync(teamEvent))
            return Result<TeamEventDto>.NotFound("Event was not found. It may have just been deleted.");

        return Result<TeamEventDto>.SuccessResult(ToDto(teamEvent));
    }

    public async Task<Result<string>> DeleteEventAsync(string userId, int teamId, int eventId)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<string>.Forbidden("Only the team Owner, Captain or Officers can delete events.");

        // One conditional delete, so two people deleting the same event at once get a 404 instead of an error.
        if (!await _eventRepository.DeleteAsync(teamId, eventId))
            return Result<string>.NotFound("Event was not found.");

        return Result<string>.SuccessResult("Event deleted.");
    }

    private async Task<bool> CanManageAsync(int teamId, string userId)
    {
        var member = await _teamRepository.GetTeamMemberAsync(teamId, userId);
        return member != null && member.CanManageTeam;
    }

    private static void Apply(TeamEvent teamEvent, SaveTeamEventDto dto)
    {
        teamEvent.Title = dto.Title.Trim();
        teamEvent.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        teamEvent.StartTime = dto.StartTime;
        teamEvent.EndTime = dto.EndTime;
        teamEvent.EventType = dto.EventType;
    }

    private static TeamEventDto ToDto(TeamEvent e) => new()
    {
        Id = e.Id,
        TeamId = e.TeamId,
        Title = e.Title,
        Description = e.Description,
        StartTime = e.StartTime,
        EndTime = e.EndTime,
        EventType = e.EventType.ToString()
    };
}
