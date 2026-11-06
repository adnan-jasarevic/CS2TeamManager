using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;
using System.Globalization;

namespace RosterSensei.Application.Services;

public class TeamEventService : ITeamEventService
{
    // Keeps a single request from pulling years of events at once.
    private static readonly TimeSpan MaxRange = TimeSpan.FromDays(400);

    private const string EditConflictMessage =
        "Someone else changed this event while you were editing it. Open it again to see their changes.";

    private const string TypeRemovedMessage =
        "That event type was just removed. Pick another type and save again.";

    private readonly ITeamEventRepository _eventRepository;
    private readonly ITeamRepository _teamRepository;

    public TeamEventService(ITeamEventRepository eventRepository, ITeamRepository teamRepository)
    {
        _eventRepository = eventRepository;
        _teamRepository = teamRepository;
    }

    public async Task<Result<List<TeamEventDto>>> GetEventsAsync(string userId, int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        if (to <= from)
            return Result<List<TeamEventDto>>.Failure("The end of the range must be after its start.");
        if (to - from > MaxRange)
            return Result<List<TeamEventDto>>.Failure("The date range is too long.");

        if (await _teamRepository.GetTeamMemberAsync(teamId, userId, cancellationToken) == null)
            return Result<List<TeamEventDto>>.Forbidden("You don't have access to the calendar of this team.");

        var events = await _eventRepository.GetEventsAsync(teamId, from, to, cancellationToken);
        return Result<List<TeamEventDto>>.SuccessResult(events.Select(ToDto).ToList());
    }

    public async Task<Result<TeamEventDto>> CreateEventAsync(string userId, int teamId, SaveTeamEventDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventDto>.Forbidden("Only the team Owner, Captain or Officers can add events.");

        var problem = await CheckTypeAndDayAsync(teamId, dto, timesChanged: true);
        if (problem != null)
            return Result<TeamEventDto>.Failure(problem);

        var teamEvent = new TeamEvent
        {
            TeamId = teamId,
            CreatedByUserId = userId
        };
        Apply(teamEvent, dto);

        var saved = await _eventRepository.AddAsync(teamEvent);
        if (saved == null)
            return Result<TeamEventDto>.Conflict(TypeRemovedMessage);

        return Result<TeamEventDto>.SuccessResult(ToDto(saved));
    }

    public async Task<Result<TeamEventDto>> UpdateEventAsync(string userId, int teamId, int eventId, SaveTeamEventDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventDto>.Forbidden("Only the team Owner, Captain or Officers can edit events.");

        if (dto.Version == null)
            return Result<TeamEventDto>.Failure("The event version is required when editing.");

        var teamEvent = await _eventRepository.GetByIdAsync(teamId, eventId);
        if (teamEvent == null)
            return Result<TeamEventDto>.NotFound("Event was not found.");

        if (teamEvent.Version != dto.Version)
            return Result<TeamEventDto>.Conflict(EditConflictMessage);

        // An event already on an off day can still be renamed or deleted, but nothing can be moved onto one.
        var timesChanged = teamEvent.StartTime != dto.StartTime || teamEvent.EndTime != dto.EndTime;
        var problem = await CheckTypeAndDayAsync(teamId, dto, timesChanged);
        if (problem != null)
            return Result<TeamEventDto>.Failure(problem);

        Apply(teamEvent, dto);
        if (!await _eventRepository.UpdateAsync(teamEvent, dto.Version.Value))
        {
            // Lost the race between loading and saving: tell a deleted event, a removed type and a newer edit apart.
            if (await _eventRepository.GetByIdAsync(teamId, eventId) == null)
                return Result<TeamEventDto>.NotFound("Event was not found. It may have just been deleted.");
            if (!await _eventRepository.EventTypeExistsAsync(teamId, dto.EventTypeId))
                return Result<TeamEventDto>.Conflict(TypeRemovedMessage);
            return Result<TeamEventDto>.Conflict(EditConflictMessage);
        }

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

    // Returns why the event can't be saved, or null when it can. An off day marked between this check
    // and the save is fine: the event then simply shows as cancelled, like any event already on that day.
    private async Task<string?> CheckTypeAndDayAsync(int teamId, SaveTeamEventDto dto, bool timesChanged)
    {
        if (!await _eventRepository.EventTypeExistsAsync(teamId, dto.EventTypeId))
            return "That event type doesn't exist in this team. Pick another one.";

        if (timesChanged)
        {
            var offDay = await _eventRepository.GetOverlappingOffDayAsync(teamId, dto.StartTime, dto.EndTime);
            if (offDay != null)
                return string.Create(CultureInfo.InvariantCulture, $"{offDay.Date:dddd d MMMM} is an off day, so no events can be planned on it.");
        }

        return null;
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
        teamEvent.EventTypeId = dto.EventTypeId;
    }

    private static TeamEventDto ToDto(TeamEvent e) => new()
    {
        Id = e.Id,
        TeamId = e.TeamId,
        Title = e.Title,
        Description = e.Description,
        StartTime = e.StartTime,
        EndTime = e.EndTime,
        EventTypeId = e.EventTypeId,
        Version = e.Version
    };
}
