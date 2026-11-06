using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Application.Validators;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;
using RosterSensei.Infrastructure.Repositories;
using RosterSensei.Tests.Infrastructure;

namespace RosterSensei.Tests;

public class MatchLineupTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _officer;
    private readonly string _player;
    private readonly string _sub;
    private readonly string _outsider;
    private readonly int _teamId;
    private readonly int _matchId;

    public MatchLineupTests()
    {
        _owner = _db.AddUser("owner");
        _officer = _db.AddUser("officer");
        _player = _db.AddUser("player");
        _sub = _db.AddUser("sub");
        _outsider = _db.AddUser("outsider");
        _teamId = _db.AddTeam(_owner, (_officer, TeamRole.Officer), (_player, TeamRole.Player), (_sub, TeamRole.Player));
        _matchId = AddMatch(_teamId);
    }

    public void Dispose() => _db.Dispose();

    private int AddMatch(int teamId)
    {
        using var context = _db.CreateContext();
        var match = new Match { TeamId = teamId, OpponentName = "Kyoto Kitsune", ScheduledDate = DateTime.UtcNow, Status = MatchStatus.Finished };
        context.Matches.Add(match);
        context.SaveChanges();
        return match.Id;
    }

    private static SetMatchLineupDto Lineup(params (string UserId, string? Role, bool Played)[] players) => new()
    {
        Players = players.Select(p => new LineupPlayerDto { UserId = p.UserId, Role = p.Role, Played = p.Played }).ToList()
    };

    private async Task<List<MatchLineupEntryDto>> StoredLineup(string asUser)
    {
        var matches = await _db.MatchService().GetTeamMatchesAsync(asUser, _teamId);
        Assert.True(matches.Success, matches.ErrorMessage);
        return matches.Data!.Single(m => m.Id == _matchId).Lineup;
    }

    [Fact]
    public async Task A_match_without_a_lineup_returns_an_empty_one()
    {
        Assert.Empty(await StoredLineup(_player));
    }

    [Fact]
    public async Task The_Owner_sets_a_lineup_and_every_member_can_read_it()
    {
        var result = await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId,
            Lineup((_owner, "  IGL ", true), (_player, "AWPer", true), (_sub, "", false)));

        Assert.True(result.Success, result.ErrorMessage);

        var lineup = await StoredLineup(_player);
        Assert.Equal(3, lineup.Count);
        var owner = Assert.Single(lineup, p => p.UserId == _owner);
        Assert.Equal("owner", owner.Username);
        Assert.Equal("IGL", owner.Role);
        Assert.True(owner.Played);
        var sub = Assert.Single(lineup, p => p.UserId == _sub);
        Assert.Null(sub.Role);
        Assert.False(sub.Played);
        // Players who played come first.
        Assert.False(lineup.Last().Played);
    }

    [Fact]
    public async Task Officers_can_set_a_lineup()
    {
        var result = await _db.MatchService().SetLineupAsync(_officer, _teamId, _matchId, Lineup((_officer, "Entry", true)));

        Assert.True(result.Success, result.ErrorMessage);
    }

    [Fact]
    public async Task Players_cannot_set_a_lineup()
    {
        var result = await _db.MatchService().SetLineupAsync(_player, _teamId, _matchId, Lineup((_player, "Entry", true)));

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        Assert.Empty(await StoredLineup(_owner));
    }

    [Fact]
    public async Task Outsiders_cannot_set_or_read_a_lineup()
    {
        Assert.Equal(ErrorType.Forbidden, (await _db.MatchService().SetLineupAsync(_outsider, _teamId, _matchId, Lineup())).ErrorType);
        Assert.Equal(ErrorType.Forbidden, (await _db.MatchService().GetTeamMatchesAsync(_outsider, _teamId)).ErrorType);
    }

    [Fact]
    public async Task Setting_a_lineup_replaces_the_old_one()
    {
        await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true), (_player, "AWPer", true)));

        await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_sub, "Rifler", true)));

        var lineup = await StoredLineup(_owner);
        Assert.Equal(_sub, Assert.Single(lineup).UserId);
    }

    [Fact]
    public async Task An_empty_list_clears_the_lineup()
    {
        await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true)));

        var result = await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup());

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Empty(await StoredLineup(_owner));
    }

    [Fact]
    public async Task Only_team_members_can_be_in_the_lineup()
    {
        var result = await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true), (_outsider, "AWPer", true)));

        Assert.Equal(ErrorType.Validation, result.ErrorType);
        Assert.Empty(await StoredLineup(_owner));
    }

    [Fact]
    public async Task A_player_who_left_stays_in_the_lineups_they_played_and_can_be_kept_on_edit()
    {
        await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true), (_player, "AWPer", true)));
        Assert.True((await _db.TeamService().LeaveTeamAsync(_teamId, _player)).Success);

        var lineup = await StoredLineup(_owner);
        Assert.Contains(lineup, p => p.UserId == _player && p.Username == "player");

        // Editing a role keeps the former member in.
        var edit = await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true), (_player, "Lurker", true)));
        Assert.True(edit.Success, edit.ErrorMessage);

        // But they can't be added to a new match.
        var otherMatch = AddMatch(_teamId);
        var add = await _db.MatchService().SetLineupAsync(_owner, _teamId, otherMatch, Lineup((_player, "AWPer", true)));
        Assert.Equal(ErrorType.Validation, add.ErrorType);
    }

    [Fact]
    public async Task A_player_can_only_be_in_the_lineup_once()
    {
        var result = await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true), (_owner, "AWPer", false)));

        Assert.Equal(ErrorType.Validation, result.ErrorType);
    }

    [Fact]
    public async Task A_match_of_another_team_is_not_found()
    {
        var otherOwner = _db.AddUser("other-owner");
        var otherTeam = _db.AddTeam(otherOwner);
        var otherMatch = AddMatch(otherTeam);

        var result = await _db.MatchService().SetLineupAsync(_owner, _teamId, otherMatch, Lineup((_owner, "IGL", true)));

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }

    [Fact]
    public async Task The_unique_index_refuses_a_player_twice_even_past_the_service()
    {
        var outcome = await new MatchRepository(_db.CreateContext()).ReplaceLineupAsync(_teamId, _matchId, new List<MatchParticipation>
        {
            new() { UserId = _owner, Played = true },
            new() { UserId = _owner, Played = false }
        });

        Assert.Equal(LineupWriteOutcome.Conflict, outcome);
        Assert.Empty(await StoredLineup(_owner));
    }

    [Fact]
    public async Task Concurrent_replacements_leave_one_whole_lineup_never_a_mix()
    {
        var first = Lineup((_owner, "IGL", true), (_player, "AWPer", true));
        var second = Lineup((_officer, "Entry", true), (_sub, "Support", true));

        var results = await Task.WhenAll(
            _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, first),
            _db.MatchService().SetLineupAsync(_officer, _teamId, _matchId, second));

        Assert.All(results, r => Assert.True(r.Success || r.ErrorType == ErrorType.Conflict, r.ErrorMessage));
        var stored = (await StoredLineup(_owner)).Select(p => p.UserId).OrderBy(id => id).ToList();
        var options = new[] { new[] { _owner, _player }, new[] { _officer, _sub } }
            .Select(ids => ids.OrderBy(id => id).ToList());
        Assert.Contains(options, ids => ids.SequenceEqual(stored));
    }

    [Fact]
    public async Task Deleting_the_team_deletes_its_lineups()
    {
        await _db.MatchService().SetLineupAsync(_owner, _teamId, _matchId, Lineup((_owner, "IGL", true)));

        Assert.True((await _db.TeamService().DeleteTeamAsync(_teamId, _owner)).Success);

        using var context = _db.CreateContext();
        Assert.Empty(context.Set<MatchParticipation>());
    }

    [Theory]
    [InlineData(11, null, false)]
    [InlineData(10, null, true)]
    [InlineData(1, "a role that is way too long, over thirty", false)]
    [InlineData(1, "Stand-in AWPer", true)]
    public void Validator_limits_the_lineup_size_and_role_length(int players, string? role, bool valid)
    {
        var dto = new SetMatchLineupDto
        {
            Players = Enumerable.Range(0, players).Select(i => new LineupPlayerDto { UserId = $"user-{i}", Role = role }).ToList()
        };

        Assert.Equal(valid, new SetMatchLineupDtoValidator().Validate(dto).IsValid);
    }

    [Fact]
    public void Validator_refuses_duplicates_and_empty_ids()
    {
        var validator = new SetMatchLineupDtoValidator();
        Assert.False(validator.Validate(Lineup(("a", null, true), ("a", null, true))).IsValid);
        Assert.False(validator.Validate(Lineup(("", null, true))).IsValid);
    }
}
