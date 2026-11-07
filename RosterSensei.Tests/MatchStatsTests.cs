using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;
using RosterSensei.Tests.Infrastructure;

namespace RosterSensei.Tests;

// The numbers behind Scrim Analytics: per-map win rates, the Official/Scrim filter, the form line,
// and how a match's series score is worked out from its maps.
public class MatchStatsTests : IDisposable
{
    private static readonly DateTime Start = new(2026, 10, 1, 18, 0, 0, DateTimeKind.Utc);

    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly int _teamId;

    public MatchStatsTests()
    {
        _owner = _db.AddUser("owner");
        _teamId = _db.AddTeam(_owner);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task A_team_without_matches_has_empty_stats()
    {
        var stats = await StatsAsync();

        Assert.Equal(0, stats.MatchesPlayed);
        Assert.Equal(0, stats.MapsPlayed);
        Assert.Empty(stats.Maps);
        Assert.Empty(stats.Form);
    }

    [Fact]
    public async Task Each_map_counts_wins_losses_draws_and_rounds()
    {
        await AddAsync(day: 1, bestOf: 3, maps: [Map("Mirage", 13, 7), Map("Inferno", 9, 13), Map("Mirage", 16, 14)]);
        await AddAsync(day: 2, bestOf: 1, maps: [Map("Mirage", 15, 15)]);

        var stats = await StatsAsync();
        var mirage = stats.Maps.Single(m => m.MapName == "Mirage");
        var inferno = stats.Maps.Single(m => m.MapName == "Inferno");

        Assert.Equal(4, stats.MapsPlayed);
        Assert.Equal((3, 2, 0, 1, 44, 36, 67), (mirage.Played, mirage.Wins, mirage.Losses, mirage.Draws, mirage.RoundsWon, mirage.RoundsLost, mirage.WinRatePercentage));
        Assert.Equal((1, 0, 1, 0, 9, 13, 0), (inferno.Played, inferno.Wins, inferno.Losses, inferno.Draws, inferno.RoundsWon, inferno.RoundsLost, inferno.WinRatePercentage));
    }

    [Fact]
    public async Task Maps_are_listed_by_times_played_then_by_name()
    {
        await AddAsync(day: 1, bestOf: 3, maps: [Map("Nuke", 13, 5), Map("Ancient", 13, 5)]);
        await AddAsync(day: 2, bestOf: 3, maps: [Map("Nuke", 13, 5), Map("Anubis", 5, 13), Map("Ancient", 13, 5)]);
        await AddAsync(day: 3, bestOf: 1, maps: [Map("Nuke", 13, 5)]);

        var stats = await StatsAsync();

        Assert.Equal(["Nuke", "Ancient", "Anubis"], stats.Maps.Select(m => m.MapName));
    }

    [Fact]
    public async Task Picked_but_unplayed_maps_are_left_out()
    {
        await AddAsync(day: 1, bestOf: 3, maps: [Map("Mirage", 13, 7), Map("Inferno", 13, 9), new MatchMapDto { MapName = "Nuke" }]);

        var stats = await StatsAsync();

        Assert.Equal(2, stats.MapsPlayed);
        Assert.DoesNotContain(stats.Maps, m => m.MapName == "Nuke");
    }

    [Theory]
    [InlineData(MatchStatus.Live)]
    [InlineData(MatchStatus.Cancelled)]
    public async Task Only_finished_matches_count(MatchStatus status)
    {
        await AddAsync(day: 1, bestOf: 1, maps: [Map("Mirage", 13, 7)]);
        await AddAsync(day: 2, bestOf: 1, maps: [Map("Mirage", 2, 13)], status: status);

        var stats = await StatsAsync();

        Assert.Equal(1, stats.MatchesPlayed);
        Assert.Equal(1, Assert.Single(stats.Maps).Played);
        Assert.Single(stats.Form);
    }

    [Fact]
    public async Task The_type_filter_splits_official_matches_from_scrims()
    {
        await AddAsync(day: 1, bestOf: 1, maps: [Map("Mirage", 13, 7)], type: MatchKind.Official);
        await AddAsync(day: 2, bestOf: 1, maps: [Map("Mirage", 3, 13)], type: MatchKind.Scrim);
        await AddAsync(day: 3, bestOf: 1, maps: [Map("Nuke", 4, 13)], type: MatchKind.Scrim);

        var all = await StatsAsync();
        var official = await StatsAsync(MatchKind.Official);
        var scrims = await StatsAsync(MatchKind.Scrim);

        Assert.Equal((3, 3), (all.MatchesPlayed, all.MapsPlayed));
        Assert.Equal((1, 1), (official.MatchesPlayed, official.MapsPlayed));
        Assert.Equal(100, Assert.Single(official.Maps).WinRatePercentage);
        Assert.Equal((2, 2), (scrims.MatchesPlayed, scrims.MapsPlayed));
        Assert.All(scrims.Form, f => Assert.Equal("Loss", f.MatchOutcome));
    }

    [Fact]
    public async Task Another_teams_matches_are_not_counted()
    {
        var other = _db.AddUser("other");
        var otherTeam = _db.AddTeam(other);
        (await _db.MatchService().AddMatchAsync(other, otherTeam, Finished(1, [Map("Mirage", 13, 0)]))).AssertSuccess();
        await AddAsync(day: 1, bestOf: 1, maps: [Map("Mirage", 0, 13)]);

        var stats = await StatsAsync();

        Assert.Equal(1, stats.MatchesPlayed);
        Assert.Equal(0, Assert.Single(stats.Maps).Wins);
    }

    // The form line is in play order, using the played date when there is one, and each point is the
    // running win rate so far.
    [Fact]
    public async Task The_form_line_is_chronological_with_a_running_win_rate()
    {
        await AddAsync(day: 5, bestOf: 1, maps: [Map("Mirage", 13, 5)], opponent: "Third");
        await AddAsync(day: 1, bestOf: 1, maps: [Map("Mirage", 5, 13)], opponent: "First", playedDay: 2);
        await AddAsync(day: 3, bestOf: 1, maps: [Map("Mirage", 13, 11)], opponent: "Second");

        var form = (await StatsAsync()).Form;

        Assert.Equal(["First", "Second", "Third"], form.Select(f => f.OpponentName));
        Assert.Equal(["Loss", "Win", "Win"], form.Select(f => f.MatchOutcome));
        Assert.Equal([0, 50, 67], form.Select(f => f.WinRatePercentage));
        Assert.Equal(Start.AddDays(2), form[0].Date);
    }

    [Fact]
    public async Task A_non_member_cannot_see_the_stats()
    {
        var stranger = _db.AddUser("stranger");

        var result = await _db.MatchService().GetTeamStatsAsync(stranger, _teamId, null);

        Assert.False(result.Success);
        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
    }

    [Fact]
    public async Task A_best_of_one_takes_its_score_from_the_rounds()
    {
        var match = await AddAsync(day: 1, bestOf: 1, maps: [Map("Mirage", 13, 9)]);

        Assert.Equal("13 - 9", match.FinalScore);
        Assert.Equal("Win", match.MatchOutcome);
    }

    [Fact]
    public async Task A_series_takes_its_score_from_the_maps_won_and_ignores_the_entered_score()
    {
        var dto = Finished(3, [Map("Mirage", 13, 9), Map("Inferno", 8, 13), Map("Nuke", 7, 13)]);
        dto.OurScore = 2;
        dto.OpponentScore = 0;

        var match = (await _db.MatchService().AddMatchAsync(_owner, _teamId, dto)).AssertSuccess();

        Assert.Equal("1 - 2", match.FinalScore);
        Assert.Equal("Loss", match.MatchOutcome);
    }

    [Fact]
    public async Task Without_map_scores_the_entered_score_is_kept()
    {
        var dto = Finished(3, [new MatchMapDto { MapName = "Mirage" }]);
        dto.OurScore = 2;
        dto.OpponentScore = 1;

        var match = (await _db.MatchService().AddMatchAsync(_owner, _teamId, dto)).AssertSuccess();

        Assert.Equal("2 - 1", match.FinalScore);
    }

    [Fact]
    public async Task Maps_keep_their_order_and_trimmed_names()
    {
        await AddAsync(day: 1, bestOf: 3, maps: [Map(" Nuke ", 13, 5), Map("Ancient", 13, 5)]);

        var match = Assert.Single((await _db.MatchService().GetTeamMatchesAsync(_owner, _teamId)).Data!);

        Assert.Equal(["Nuke", "Ancient"], match.Maps.Select(m => m.MapName));
    }

    [Theory]
    [InlineData(TeamRole.Captain, true)]
    [InlineData(TeamRole.Officer, true)]
    [InlineData(TeamRole.Player, false)]
    public async Task Only_team_leaders_can_add_matches(TeamRole role, bool allowed)
    {
        var member = _db.AddUser("member");
        // The owner plays here so the member can be the one Captain.
        var teamId = _db.AddTeam(_owner, TeamRole.Player, (member, role));

        var result = await _db.MatchService().AddMatchAsync(member, teamId, Finished(1, [Map("Mirage", 13, 5)]));

        Assert.Equal(allowed, result.Success);
        if (!allowed) Assert.Equal(ErrorType.Forbidden, result.ErrorType);
    }

    [Fact]
    public async Task Adding_a_match_to_a_missing_team_is_not_found()
    {
        var result = await _db.MatchService().AddMatchAsync(_owner, 9999, Finished(1, [Map("Mirage", 13, 5)]));

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }

    private async Task<TeamStatsDto> StatsAsync(MatchKind? type = null) =>
        (await _db.MatchService().GetTeamStatsAsync(_owner, _teamId, type)).AssertSuccess();

    private async Task<MatchDto> AddAsync(int day, int bestOf, MatchMapDto[] maps, MatchStatus status = MatchStatus.Finished,
        MatchKind type = MatchKind.Official, string opponent = "Rivals", int? playedDay = null)
    {
        var dto = Finished(bestOf, maps);
        dto.ScheduledDate = Start.AddDays(day);
        dto.PlayedDate = playedDay.HasValue ? Start.AddDays(playedDay.Value) : null;
        dto.Status = status;
        dto.Type = type;
        dto.OpponentName = opponent;
        return (await _db.MatchService().AddMatchAsync(_owner, _teamId, dto)).AssertSuccess();
    }

    private static CreateMatchDto Finished(int bestOf, MatchMapDto[] maps) => new()
    {
        OpponentName = "Rivals",
        ScheduledDate = Start,
        Status = MatchStatus.Finished,
        Type = MatchKind.Official,
        BestOf = bestOf,
        Maps = maps.ToList()
    };

    private static MatchMapDto Map(string name, int our, int opponent) =>
        new() { MapName = name, OurScore = our, OpponentScore = opponent };
}

internal static class ResultAssertions
{
    public static T AssertSuccess<T>(this Result<T> result)
    {
        Assert.True(result.Success, result.ErrorMessage);
        return result.Data!;
    }
}
