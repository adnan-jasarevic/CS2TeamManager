using RosterSensei.Application.Interfaces;
using RosterSensei.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace RosterSensei.Infrastructure.Services;

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

    public async Task<string> GetUsernameByIdAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);

        return user?.UserName ?? "Team Owner";
    }

    public async Task<Dictionary<string, string>> GetUsernamesByIdsAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<string, string>();

        return await _userManager.Users
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UserName ?? string.Empty, cancellationToken);
    }

}
