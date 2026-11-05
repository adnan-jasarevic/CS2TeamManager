using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CS2TeamManager.Tests;

public class TeamRoleTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _player;
    private readonly string _player2;
    private readonly int _teamId;

    public TeamRoleTests()
    {
        _owner = _db.AddUser("owner");
        _player = _db.AddUser("player");
        _player2 = _db.AddUser("player2");
        // The Owner is also the Captain, as when a team is created.
        _teamId = _db.AddTeam(_owner,
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
    public async Task Owner_can_hand_the_Captain_role_to_someone_else_and_stay_Owner()
    {
        Assert.True((await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _owner, "Officer")).Success);

        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Captain");

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(TeamRole.Captain, _db.RoleOf(_teamId, _player));
        Assert.Equal(TeamRole.Officer, _db.RoleOf(_teamId, _owner));
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Owner_keeps_Owner_rights_whatever_their_role()
    {
        Assert.True((await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _owner, "Player")).Success);

        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Officer");

        Assert.True(result.Success, result.ErrorMessage);
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
}
