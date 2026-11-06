using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface ITeamOffDayService
{
    Task<Result<List<TeamOffDayDto>>> GetAsync(string userId, int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<Result<TeamOffDayDto>> MarkAsync(string userId, int teamId, DateOnly date, SaveTeamOffDayDto dto);
    Task<Result<string>> UnmarkAsync(string userId, int teamId, DateOnly date);
}
