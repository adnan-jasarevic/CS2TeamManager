using Microsoft.IdentityModel.Tokens;
using RosterSensei.Application.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace RosterSensei.Tests.Api;

// End-to-end checks through HTTP: the parts the service tests can't see, like routing, the JWT setup,
// the validation filter and how a failed Result turns into a status code.
public class HttpApiTests : IDisposable
{
    private readonly ApiFactory _api = new();

    [Fact]
    public async Task A_registered_user_can_log_in_and_call_the_api()
    {
        var client = await _api.SignedInClientAsync("alice");

        var response = await client.GetAsync("/api/Teams/my-teams");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<List<TeamDto>>())!);
    }

    [Fact]
    public async Task Login_returns_the_username_with_the_token()
    {
        await _api.SignedInClientAsync("alice");

        var response = await _api.CreateClient().PostAsJsonAsync("/api/Auth/login",
            new LoginDto { Email = ApiFactory.EmailOf("alice"), Password = ApiFactory.Password });
        var auth = await response.Content.ReadFromJsonAsync<AuthResponseDto>();

        Assert.Equal("alice", auth!.Username);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
    }

    [Fact]
    public async Task A_wrong_password_is_rejected_with_401()
    {
        await _api.SignedInClientAsync("alice");

        var response = await _api.CreateClient().PostAsJsonAsync("/api/Auth/login",
            new LoginDto { Email = ApiFactory.EmailOf("alice"), Password = "Wr0ng!Password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Registering_the_same_email_twice_is_rejected()
    {
        await _api.SignedInClientAsync("alice");

        var response = await _api.CreateClient().PostAsJsonAsync("/api/Auth/register", new RegisterDto
        {
            Email = ApiFactory.EmailOf("alice"),
            Username = "alice2",
            Password = ApiFactory.Password
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("DuplicateEmail", await response.Content.ReadAsStringAsync());
    }

    // Two accounts with one email made FindByEmailAsync throw, so the first user could no longer log in.
    [Fact]
    public async Task The_first_user_can_still_log_in_after_a_duplicate_email_is_refused()
    {
        await _api.SignedInClientAsync("alice");
        await _api.CreateClient().PostAsJsonAsync("/api/Auth/register", new RegisterDto
        {
            Email = ApiFactory.EmailOf("ALICE"),
            Username = "alice2",
            Password = ApiFactory.Password
        });

        var response = await _api.CreateClient().PostAsJsonAsync("/api/Auth/login",
            new LoginDto { Email = ApiFactory.EmailOf("alice"), Password = ApiFactory.Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_weak_password_is_rejected_by_identity()
    {
        var response = await _api.CreateClient().PostAsJsonAsync("/api/Auth/register", new RegisterDto
        {
            Email = ApiFactory.EmailOf("bob"),
            Username = "bob",
            Password = "short"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/Teams/my-teams")]
    [InlineData("/api/Teams/my-invites")]
    [InlineData("/api/Matches/1")]
    [InlineData("/api/teams/1/events?from=2026-01-01&to=2026-02-01")]
    [InlineData("/api/Account/steam")]
    public async Task Protected_endpoints_need_a_token(string path)
    {
        var response = await _api.CreateClient().GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_garbage_token_is_rejected()
    {
        var client = _api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-jwt");

        var response = await client.GetAsync("/api/Teams/my-teams");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_token_signed_with_another_key_is_rejected()
    {
        var client = _api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            TokenSignedWith("a-different-key-that-is-also-long-enough-for-hs256", expires: DateTime.UtcNow.AddHours(1)));

        var response = await client.GetAsync("/api/Teams/my-teams");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task An_expired_token_is_rejected()
    {
        var client = _api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            TokenSignedWith(ApiFactory.JwtKey, expires: DateTime.UtcNow.AddHours(-1)));

        var response = await client.GetAsync("/api/Teams/my-teams");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task An_invalid_body_returns_validation_problem_details()
    {
        var client = await _api.SignedInClientAsync("alice");

        var response = await client.PostAsJsonAsync("/api/Teams", new CreateTeamDto { Name = "x!" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(body.RootElement.GetProperty("errors").TryGetProperty("Name", out _));
    }

    [Fact]
    public async Task Creating_a_team_makes_the_creator_its_owner_and_captain()
    {
        var client = await _api.SignedInClientAsync("alice");

        var created = await client.PostAsJsonAsync("/api/Teams", new CreateTeamDto { Name = "Sensei Five" });
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/Teams/my-teams");

        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var team = Assert.Single(teams!);
        Assert.Equal("Sensei Five", team.Name);
        Assert.Equal("Captain", team.CurrentUserRole);
        Assert.True(team.IsOwner);
    }

    [Fact]
    public async Task A_forbidden_result_returns_403_with_a_message()
    {
        var alice = await _api.SignedInClientAsync("alice");
        var bob = await _api.SignedInClientAsync("bob");
        var teamId = await CreateTeamAsync(alice, "Alpha Team");

        var response = await bob.GetAsync($"/api/Teams/{teamId}/members");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(await MessageOf(response)));
    }

    [Fact]
    public async Task A_not_found_result_returns_404_with_a_message()
    {
        var alice = await _api.SignedInClientAsync("alice");

        var response = await alice.GetAsync("/api/Matches/99999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(await MessageOf(response)));
    }

    [Fact]
    public async Task A_conflict_result_returns_409_with_a_message()
    {
        var alice = await _api.SignedInClientAsync("alice");
        var bob = await _api.SignedInClientAsync("bob");
        var steam = new LinkSteamAccountDto { Steam = "76561197960287930" };
        (await alice.PutAsJsonAsync("/api/Account/steam", steam)).EnsureSuccessStatusCode();

        var response = await bob.PutAsJsonAsync("/api/Account/steam", steam);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(await MessageOf(response)));
    }

    [Fact]
    public async Task Members_of_a_team_can_see_each_other()
    {
        var alice = await _api.SignedInClientAsync("alice");
        var teamId = await CreateTeamAsync(alice, "Alpha Team");

        var members = await alice.GetFromJsonAsync<List<TeamMemberDto>>($"/api/Teams/{teamId}/members");

        var member = Assert.Single(members!);
        Assert.Equal("alice", member.Username);
        Assert.True(member.IsOwner);
    }

    // Each request gets its own scoped DbContext and its own connection; parallel requests must not
    // share or exhaust them.
    [Fact]
    public async Task Parallel_requests_each_get_their_own_database_context()
    {
        var alice = await _api.SignedInClientAsync("alice");
        var teamId = await CreateTeamAsync(alice, "Alpha Team");

        var responses = await Task.WhenAll(Enumerable.Range(0, 25).Select(i => i % 2 == 0
            ? alice.GetAsync("/api/Teams/my-teams")
            : alice.GetAsync($"/api/Teams/{teamId}/dashboard")));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
    }

    private static async Task<int> CreateTeamAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/Teams", new CreateTeamDto { Name = name });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TeamDto>())!.Id;
    }

    private static async Task<string?> MessageOf(HttpResponseMessage response)
    {
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.GetProperty("message").GetString();
    }

    private static string TokenSignedWith(string key, DateTime expires)
    {
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: "RosterSenseiApi",
            audience: "RosterSenseiClient",
            claims: [new Claim(ClaimTypes.NameIdentifier, "someone")],
            notBefore: expires.AddHours(-2),
            expires: expires,
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public void Dispose() => _api.Dispose();
}
