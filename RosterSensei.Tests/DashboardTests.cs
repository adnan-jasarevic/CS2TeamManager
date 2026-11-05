using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Entities;
using RosterSensei.Tests.Infrastructure;

namespace RosterSensei.Tests;

public class DashboardTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly int _teamId;

    public DashboardTests()
    {
        _owner = _db.AddUser("owner");
        _teamId = _db.AddTeam(_owner);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Upcoming_count_includes_matches_beyond_the_first_five()
    {
        for (int day = 1; day <= 7; day++)
            await AddMatchAsync($"Upcoming {day}", MatchStatus.Scheduled, DateTime.UtcNow.AddDays(day));

        var dashboard = (await _db.TeamService().GetTeamDashboardAsync(_teamId, _owner)).Data!;

        Assert.Equal(7, dashboard.UpcomingMatchesCount);
        Assert.Equal(5, dashboard.UpcomingMatches.Count);
        Assert.Equal("Upcoming 1", dashboard.UpcomingMatches[0].OpponentName);
    }

    [Fact]
    public async Task Recent_matches_are_ordered_by_the_date_they_were_played()
    {
        // Scheduled first but played last, for example after being postponed.
        await AddMatchAsync("Postponed", MatchStatus.Finished, DateTime.UtcNow.AddDays(-10), played: DateTime.UtcNow.AddDays(-1));
        await AddMatchAsync("On time", MatchStatus.Finished, DateTime.UtcNow.AddDays(-5));

        var dashboard = (await _db.TeamService().GetTeamDashboardAsync(_teamId, _owner)).Data!;

        Assert.Equal(new[] { "Postponed", "On time" }, dashboard.RecentMatches.Select(m => m.OpponentName));
        Assert.NotNull(dashboard.RecentMatches[0].PlayedDate);
        Assert.Null(dashboard.RecentMatches[1].PlayedDate);
    }

    private async Task AddMatchAsync(string opponent, MatchStatus status, DateTime scheduled, DateTime? played = null)
    {
        var dto = new CreateMatchDto
        {
            OpponentName = opponent,
            ScheduledDate = scheduled,
            PlayedDate = played,
            Status = status,
            Type = MatchKind.Scrim,
            BestOf = 1
        };
        var result = await _db.MatchService().AddMatchAsync(_owner, _teamId, dto);
        Assert.True(result.Success, result.ErrorMessage);
    }
}
