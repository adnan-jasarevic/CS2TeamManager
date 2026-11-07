using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using RosterSensei.Infrastructure.Persistence;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using RosterSensei.Application.DTOs;

namespace RosterSensei.Tests.Api;

// Runs the real API (routing, JWT auth, validation filter, error mapping) in memory, with SQL Server
// swapped for a private SQLite database. Each test class instance gets its own database.
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    // A shared-cache in-memory database lives as long as one connection to it stays open. Every
    // DbContext opens and closes its own connection, like the pooled SQL Server connections in production,
    // so parallel requests never share one SqliteConnection.
    private readonly string _connectionString = $"DataSource=file:api-{Guid.NewGuid():N}?mode=memory&cache=shared";
    private readonly SqliteConnection _keepAlive;

    public ApiFactory()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        // UseSetting reaches the configuration Program.cs reads before Build(), where it checks the key.
        builder.UseSetting("Jwt:Key", JwtKey);
        builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connectionString));
        });
    }

    // Creates the schema once the app's own container exists, instead of building a second one.
    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
        return host;
    }

    // Registers and logs in a user, and returns a client that sends their token.
    public async Task<HttpClient> SignedInClientAsync(string name)
    {
        var client = CreateClient();
        var register = await client.PostAsJsonAsync("/api/Auth/register", new RegisterDto
        {
            Email = EmailOf(name),
            Username = name,
            Password = Password
        });
        register.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/Auth/login", new LoginDto { Email = EmailOf(name), Password = Password });
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponseDto>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    public const string Password = "Str0ng!Passw0rd";
    public const string JwtKey = "test-signing-key-that-is-long-enough-for-hs256";

    public static string EmailOf(string name) => $"{name}@example.com";

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
            _keepAlive.Dispose();
    }
}
