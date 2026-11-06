namespace RosterSensei.Application.Interfaces;

public interface IUserRepository
{
    Task<bool> UserExistsAsync(string userId, CancellationToken cancellationToken = default);

    // Null when the user has no Steam account linked (or doesn't exist).
    Task<string?> GetSteamIdAsync(string userId, CancellationToken cancellationToken = default);

    // The ID of the user who has this Steam account linked, or null.
    Task<string?> GetUserIdBySteamIdAsync(string steamId, CancellationToken cancellationToken = default);

    // Sets or clears (null) the user's Steam ID. Conflict when another user linked the same account first,
    // which the unique index catches even when both requests pass the check at the same time.
    Task<WriteOutcome> SetSteamIdAsync(string userId, string? steamId);
}
