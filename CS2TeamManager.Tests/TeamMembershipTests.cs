using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Tests.Infrastructure;

namespace CS2TeamManager.Tests;

public class TeamMembershipTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _player;
    private readonly int _teamId;

    public TeamMembershipTests()
    {
        _owner = _db.AddUser("owner");
        _player = _db.AddUser("player");
        _teamId = _db.AddTeam(_owner, (_player, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Creator_owns_the_new_team_and_is_its_Captain()
    {
        var creator = _db.AddUser("creator");

        var result = await _db.TeamService().CreateTeamAsync(creator, new CreateTeamDto { Name = "Five Stack" });

        Assert.True(result.Success, result.ErrorMessage);
        Assert.True(result.Data!.IsOwner);
        Assert.Equal("Captain", result.Data.CurrentUserRole);
        Assert.Equal(creator, _db.OwnerOf(result.Data.Id));
        Assert.Equal(TeamRole.Captain, _db.RoleOf(result.Data.Id, creator));
    }

    [Fact]
    public async Task A_user_can_own_at_most_three_teams()
    {
        var creator = _db.AddUser("creator");
        for (int i = 0; i < 3; i++)
            Assert.True((await _db.TeamService().CreateTeamAsync(creator, new CreateTeamDto { Name = $"Team {i}" })).Success);

        var fourth = await _db.TeamService().CreateTeamAsync(creator, new CreateTeamDto { Name = "Team 4" });

        Assert.False(fourth.Success);
    }

    [Fact]
    public async Task My_teams_lists_every_team_with_my_role()
    {
        var otherOwner = _db.AddUser("other");
        _db.AddTeam(otherOwner, (_player, TeamRole.Officer));

        var teams = await _db.TeamService().GetUserTeamsAsync(_player);

        Assert.Equal(2, teams.Count);
        Assert.Contains(teams, t => t.CurrentUserRole == "Player" && !t.IsOwner);
        Assert.Contains(teams, t => t.CurrentUserRole == "Officer" && !t.IsOwner);
        Assert.True(Assert.Single(await _db.TeamService().GetUserTeamsAsync(otherOwner)).IsOwner);
    }

    [Fact]
    public async Task Members_list_has_usernames_roles_and_the_Owner()
    {
        var result = await _db.TeamService().GetTeamMembersAsync(_teamId, _player);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Collection(result.Data!.OrderBy(m => m.Username),
            m => Assert.Equal(("owner", "Captain", true), (m.Username, m.Role, m.IsOwner)),
            m => Assert.Equal(("player", "Player", false), (m.Username, m.Role, m.IsOwner)));
    }

    [Fact]
    public async Task Owner_can_remove_a_player()
    {
        var result = await _db.TeamService().RemoveMemberAsync(_teamId, _owner, _player);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(_db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task A_player_can_remove_themselves()
    {
        var result = await _db.TeamService().RemoveMemberAsync(_teamId, _player, _player);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(_db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task The_Owner_cannot_be_removed()
    {
        var result = await _db.TeamService().RemoveMemberAsync(_teamId, _owner, _owner);

        Assert.False(result.Success);
        Assert.NotNull(_db.RoleOf(_teamId, _owner));
    }

    [Fact]
    public async Task Outsiders_cannot_remove_anyone()
    {
        var outsider = _db.AddUser("outsider");

        var result = await _db.TeamService().RemoveMemberAsync(_teamId, outsider, _player);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
    }

    [Fact]
    public async Task Removing_from_a_missing_team_is_not_found()
    {
        var result = await _db.TeamService().RemoveMemberAsync(999, _owner, _player);

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }
}
