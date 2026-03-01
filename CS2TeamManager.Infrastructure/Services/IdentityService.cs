using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace CS2TeamManager.Infrastructure.Services;

public class IdentityService : IIdentityService
{
    private readonly UserManager<AppUser> _userManager;

    public IdentityService(UserManager<AppUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<(bool Exists, string UserId)> CheckUserExistsAndGetIdAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);

        if (user == null)
            return (false, string.Empty);

        return (true, user.Id);
    }
}
