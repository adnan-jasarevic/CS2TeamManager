using RosterSensei.Application.Interfaces;
using RosterSensei.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace RosterSensei.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> UserExistsAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.Users.AnyAsync(u => u.Id == userId, cancellationToken);
    }

    public async Task<string?> GetSteamIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.SteamId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<string?> GetUserIdBySteamIdAsync(string steamId, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .Where(u => u.SteamId == steamId)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<WriteOutcome> SetSteamIdAsync(string userId, string? steamId)
    {
        try
        {
            // A single UPDATE of one column: it doesn't load the user, so it can't overwrite a concurrent
            // password or profile change, and it doesn't trip Identity's ConcurrencyStamp check.
            var updated = await _context.Users
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.SteamId, steamId));

            return updated == 1 ? WriteOutcome.Done : WriteOutcome.Rejected;
        }
        // The unique index on SteamId rejects a second user linking the same account.
        catch (Exception ex) when (ex is DbUpdateException or DbException)
        {
            return WriteOutcome.Conflict;
        }
    }
}
