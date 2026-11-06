using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public interface IAccountService
{
    Task<Result<SteamAccountDto>> GetSteamAccountAsync(string userId, CancellationToken cancellationToken = default);
    Task<Result<SteamAccountDto>> LinkSteamAccountAsync(string userId, LinkSteamAccountDto dto);
    Task<Result<string>> UnlinkSteamAccountAsync(string userId);
}
