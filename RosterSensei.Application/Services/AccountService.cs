using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;

namespace RosterSensei.Application.Services;

public class AccountService : IAccountService
{
    private const string AlreadyLinked = "This Steam account is already linked to another Roster Sensei account.";

    private readonly IUserRepository _userRepository;

    public AccountService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<Result<SteamAccountDto>> GetSteamAccountAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (!await _userRepository.UserExistsAsync(userId, cancellationToken))
            return Result<SteamAccountDto>.NotFound("User not found.");

        var steamId = await _userRepository.GetSteamIdAsync(userId, cancellationToken);
        return Result<SteamAccountDto>.SuccessResult(ToDto(steamId));
    }

    public async Task<Result<SteamAccountDto>> LinkSteamAccountAsync(string userId, LinkSteamAccountDto dto)
    {
        // The validator already rejects bad input; this keeps the service safe when called directly.
        if (SteamId.IsCustomProfileUrl(dto.Steam))
            return Result<SteamAccountDto>.Failure(SteamId.CustomUrlHint);
        if (!SteamId.TryParse(dto.Steam, out var steamId))
            return Result<SteamAccountDto>.Failure(SteamId.FormatHint);

        if (!await _userRepository.UserExistsAsync(userId))
            return Result<SteamAccountDto>.NotFound("User not found.");

        var linkedTo = await _userRepository.GetUserIdBySteamIdAsync(steamId);
        if (linkedTo == userId)
            return Result<SteamAccountDto>.SuccessResult(ToDto(steamId));
        if (linkedTo != null)
            return Result<SteamAccountDto>.Conflict(AlreadyLinked);

        return await _userRepository.SetSteamIdAsync(userId, steamId) switch
        {
            WriteOutcome.Done => Result<SteamAccountDto>.SuccessResult(ToDto(steamId)),
            WriteOutcome.Conflict => Result<SteamAccountDto>.Conflict(AlreadyLinked),
            _ => Result<SteamAccountDto>.NotFound("User not found.")
        };
    }

    public async Task<Result<string>> UnlinkSteamAccountAsync(string userId)
    {
        // Unlinking is idempotent: clearing an empty link still succeeds.
        return await _userRepository.SetSteamIdAsync(userId, null) == WriteOutcome.Done
            ? Result<string>.SuccessResult("Steam account unlinked.")
            : Result<string>.NotFound("User not found.");
    }

    private static SteamAccountDto ToDto(string? steamId) => new()
    {
        SteamId = steamId,
        ProfileUrl = steamId == null ? null : SteamId.ProfileUrl(steamId)
    };
}
