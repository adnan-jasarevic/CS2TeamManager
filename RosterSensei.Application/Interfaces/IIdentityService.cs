namespace RosterSensei.Application.Interfaces;

public interface IIdentityService
{
    Task<(bool Exists, string UserId)> CheckUserExistsAndGetIdAsync(string email);
    Task<string> GetUsernameByIdAsync(string userId);

    // Usernames for many users in one query, keyed by user ID. Unknown IDs are left out.
    Task<Dictionary<string, string>> GetUsernamesByIdsAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);
}
