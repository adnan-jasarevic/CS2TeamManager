using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Tests.Infrastructure;

namespace CS2TeamManager.Tests;

// The dashboard, matches and statistics endpoints all report results as "Win", "Loss" or "Draw",
// with the score written the same way.
public class MatchOutcomeTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly int _teamId;

    public MatchOutcomeTests()
    {
        _owner = _db.AddUser("owner");
        _teamId = _db.AddTeam(_owner);
    }

    public void Dispose() => _db.Dispose();

    [Theory]
    [InlineData(16, 10, "Win")]
    [InlineData(8, 13, "Loss")]
    [InlineData(15, 15, "Draw")]
    public async Task Every_endpoint_reports_the_same_outcome_and_score(int ours, int theirs, string expected)
    {
        await AddFinishedMatchAsync(ours, theirs);
        var expectedScore = $"{ours} - {theirs}";

        var matches = (await _db.MatchService().GetTeamMatchesAsync(_owner, _teamId)).Data!;
        var dashboard = (await _db.TeamService().GetTeamDashboardAsync(_teamId, _owner)).Data!;
        var stats = (await _db.MatchService().GetTeamStatsAsync(_owner, _teamId, null)).Data!;

        Assert.Equal(expected, Assert.Single(matches).MatchOutcome);
        Assert.Equal(expectedScore, matches[0].FinalScore);
        Assert.Equal(expected, Assert.Single(dashboard.RecentMatches).MatchOutcome);
        Assert.Equal(expectedScore, dashboard.RecentMatches[0].FinalScore);
        Assert.Equal(expected, Assert.Single(stats.Form).MatchOutcome);
    }

    [Theory]
    [InlineData(2, 1, MatchOutcome.Win)]
    [InlineData(0, 2, MatchOutcome.Loss)]
    [InlineData(1, 1, MatchOutcome.Draw)]
    public void Outcome_follows_the_series_score(int ours, int theirs, MatchOutcome expected)
    {
        var match = new Match { OurScore = ours, OpponentScore = theirs };
        Assert.Equal(expected, match.Outcome);
    }

    private async Task AddFinishedMatchAsync(int ours, int theirs)
    {
        var dto = new CreateMatchDto
        {
            OpponentName = "Opponent",
            ScheduledDate = DateTime.UtcNow.AddDays(-1),
            Status = MatchStatus.Finished,
            Type = MatchKind.Scrim,
            OurScore = ours,
            OpponentScore = theirs,
            BestOf = 1
        };
        var result = await _db.MatchService().AddMatchAsync(_owner, _teamId, dto);
        Assert.True(result.Success, result.ErrorMessage);
    }
}
