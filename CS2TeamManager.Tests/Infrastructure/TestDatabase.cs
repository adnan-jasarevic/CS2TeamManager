using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Application.Services;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Infrastructure.Identity;
using CS2TeamManager.Infrastructure.Persistence;
using CS2TeamManager.Infrastructure.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CS2TeamManager.Tests.Infrastructure;

// A throwaway SQLite database in memory, built from the real AppDbContext model, so the services run
// against the real repositories, unique indexes and transactions. Each test class instance gets its own.
public sealed class TestDatabase : IDisposable
{
    private readonly SqliteConnection _connection;

    public TestDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    public AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    // Services get a fresh context each time, like one HTTP request in the API.
    public TeamService TeamService()
    {
        var context = CreateContext();
        return new TeamService(new TeamRepository(context), new FakeIdentityService(context));
    }

    public MatchService MatchService()
    {
        var context = CreateContext();
        return new MatchService(new MatchRepository(context), new TeamRepository(context));
    }

    public TeamEventService EventService()
    {
        var context = CreateContext();
        return new TeamEventService(new TeamEventRepository(context), new TeamRepository(context));
    }

    public string AddUser(string name)
    {
        using var context = CreateContext();
        var user = new AppUser
        {
            Id = name,
            UserName = name,
            NormalizedUserName = name.ToUpperInvariant(),
            Email = EmailOf(name),
            NormalizedEmail = EmailOf(name).ToUpperInvariant()
        };
        context.Users.Add(user);
        context.SaveChanges();
        return user.Id;
    }

    public static string EmailOf(string name) => $"{name}@example.com";

    // Creates a team owned by ownerId, with the other members added directly in the given roles.
    public int AddTeam(string ownerId, params (string UserId, TeamRole Role)[] members)
    {
        using var context = CreateContext();
        var team = new Team { Name = $"Team of {ownerId}" };
        team.Members.Add(new TeamMember { UserId = ownerId, Role = TeamRole.Owner });
        foreach (var (userId, role) in members)
            team.Members.Add(new TeamMember { UserId = userId, Role = role });

        context.Teams.Add(team);
        context.SaveChanges();
        return team.Id;
    }

    public TeamRole? RoleOf(int teamId, string userId)
    {
        using var context = CreateContext();
        return context.TeamMembers
            .Where(m => m.TeamId == teamId && m.UserId == userId)
            .Select(m => (TeamRole?)m.Role)
            .FirstOrDefault();
    }

    public void Dispose() => _connection.Dispose();

    private sealed class FakeIdentityService : IIdentityService
    {
        private readonly AppDbContext _context;

        public FakeIdentityService(AppDbContext context) => _context = context;

        public Task<(bool Exists, string UserId)> CheckUserExistsAndGetIdAsync(string email)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == email);
            return Task.FromResult(user == null ? (false, string.Empty) : (true, user.Id));
        }

        public Task<string> GetUsernameByIdAsync(string userId) =>
            Task.FromResult(_context.Users.FirstOrDefault(u => u.Id == userId)?.UserName ?? "Unknown");
    }
}
