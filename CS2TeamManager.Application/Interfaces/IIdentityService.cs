namespace CS2TeamManager.Application.Interfaces;

public interface IIdentityService
{
    Task<(bool Exists, string UserId)> CheckUserExistsAndGetIdAsync(string email);
    Task<string> GetUsernameByIdAsync(string userId);
}
