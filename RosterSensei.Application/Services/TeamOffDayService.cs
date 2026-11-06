using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Services;

public class TeamOffDayService : ITeamOffDayService
{
    // Keeps a single request from pulling years of off days at once, like the events endpoint.
    private static readonly TimeSpan MaxRange = TimeSpan.FromDays(400);

    // Local midnight is at most 14 hours from UTC midnight (UTC-12 to UTC+14).
    private static readonly TimeSpan MaxUtcOffset = TimeSpan.FromHours(14);

    private const string ManageForbiddenMessage = "Only the team Owner, Captain or Officers can change off days.";

    private readonly ITeamOffDayRepository _offDayRepository;
    private readonly ITeamRepository _teamRepository;

    public TeamOffDayService(ITeamOffDayRepository offDayRepository, ITeamRepository teamRepository)
    {
        _offDayRepository = offDayRepository;
        _teamRepository = teamRepository;
    }

    public async Task<Result<List<TeamOffDayDto>>> GetAsync(string userId, int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        if (to <= from)
            return Result<List<TeamOffDayDto>>.Failure("The end of the range must be after its start.");
        if (to - from > MaxRange)
            return Result<List<TeamOffDayDto>>.Failure("The date range is too long.");

        if (await _teamRepository.GetTeamMemberAsync(teamId, userId, cancellationToken) == null)
            return Result<List<TeamOffDayDto>>.Forbidden("You don't have access to the calendar of this team.");

        var days = await _offDayRepository.GetAsync(teamId, from, to, cancellationToken);
        return Result<List<TeamOffDayDto>>.SuccessResult(days.Select(ToDto).ToList());
    }

    public async Task<Result<TeamOffDayDto>> MarkAsync(string userId, int teamId, DateOnly date, SaveTeamOffDayDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamOffDayDto>.Forbidden(ManageForbiddenMessage);

        var utcMidnight = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        if ((dto.StartTime.ToUniversalTime() - utcMidnight).Duration() > MaxUtcOffset)
            return Result<TeamOffDayDto>.Failure("The times sent don't belong to that day.");

        var offDay = new TeamOffDay
        {
            TeamId = teamId,
            Date = date,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            CreatedByUserId = userId
        };

        // Marking a day that's already off (twice in a row, or by two people at once) is not an error.
        // Events already on the day are left alone: they show as cancelled and come back if the day is unmarked.
        await _offDayRepository.AddAsync(offDay);
        return Result<TeamOffDayDto>.SuccessResult(ToDto(offDay));
    }

    public async Task<Result<string>> UnmarkAsync(string userId, int teamId, DateOnly date)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<string>.Forbidden(ManageForbiddenMessage);

        if (!await _offDayRepository.DeleteAsync(teamId, date))
            return Result<string>.NotFound("That day isn't an off day.");

        return Result<string>.SuccessResult("The day is no longer an off day.");
    }

    private async Task<bool> CanManageAsync(int teamId, string userId)
    {
        var member = await _teamRepository.GetTeamMemberAsync(teamId, userId);
        return member != null && member.CanManageTeam;
    }

    private static TeamOffDayDto ToDto(TeamOffDay d) => new()
    {
        Date = d.Date,
        StartTime = d.StartTime,
        EndTime = d.EndTime
    };
}
