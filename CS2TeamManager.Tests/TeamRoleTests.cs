using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CS2TeamManager.Tests;

public class TeamRoleTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _captain;
    private readonly string _player;
    private readonly string _player2;
    private readonly int _teamId;

    public TeamRoleTests()
    {
        _owner = _db.AddUser("owner");
        _captain = _db.AddUser("captain");
        _player = _db.AddUser("player");
        _player2 = _db.AddUser("player2");
        _teamId = _db.AddTeam(_owner,
            (_captain, TeamRole.Captain),
            (_player, TeamRole.Player),
            (_player2, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task A_team_cannot_get_a_second_Captain()
    {
        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Captain");

        Assert.False(result.Success);
        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task Captain_can_be_handed_over_once_the_old_one_steps_down()
    {
        Assert.True((await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _captain, "Player")).Success);

        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Captain");

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(TeamRole.Captain, _db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task A_team_can_have_several_Officers()
    {
        Assert.True((await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Officer")).Success);
        Assert.True((await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player2, "officer")).Success);

        Assert.Equal(TeamRole.Officer, _db.RoleOf(_teamId, _player));
        Assert.Equal(TeamRole.Officer, _db.RoleOf(_teamId, _player2));
    }

    [Fact]
    public async Task Unknown_role_is_rejected()
    {
        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Coach");

        Assert.False(result.Success);
        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _player));
    }

    [Fact]
    public void Database_rejects_a_second_Captain_even_if_the_service_check_is_skipped()
    {
        using var context = _db.CreateContext();
        var member = context.TeamMembers.Single(m => m.TeamId == _teamId && m.UserId == _player);
        member.Role = TeamRole.Captain;

        Assert.Throws<DbUpdateException>(() => context.SaveChanges());
    }

    [Fact]
    public void Database_rejects_a_second_Owner()
    {
        using var context = _db.CreateContext();
        var member = context.TeamMembers.Single(m => m.TeamId == _teamId && m.UserId == _player);
        member.Role = TeamRole.Owner;

        Assert.Throws<DbUpdateException>(() => context.SaveChanges());
    }
}
