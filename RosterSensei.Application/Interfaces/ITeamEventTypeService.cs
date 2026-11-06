using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface ITeamEventTypeService
{
    Task<Result<TeamEventTypesDto>> GetAsync(string userId, int teamId, CancellationToken cancellationToken = default);
    Task<Result<TeamEventTypeDto>> CreateCustomAsync(string userId, int teamId, SaveTeamEventTypeDto dto);
    Task<Result<TeamEventTypeDto>> AddPresetAsync(string userId, int teamId, string preset);
    Task<Result<TeamEventTypeDto>> UpdateAsync(string userId, int teamId, int typeId, SaveTeamEventTypeDto dto);
    Task<Result<string>> DeleteAsync(string userId, int teamId, int typeId);
    Task<Result<string>> DeleteAllAsync(string userId, int teamId);
}
