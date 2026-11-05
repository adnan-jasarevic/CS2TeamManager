using CS2TeamManager.Application.Common;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Tests.Infrastructure;

namespace CS2TeamManager.Tests;

public class OwnershipTransferTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _officer;
    private readonly string _player;
    private readonly int _teamId;

    public OwnershipTransferTests()
    {
        _owner = _db.AddUser("owner");
        _officer = _db.AddUser("officer");
        _player = _db.AddUser("player");
        // The Owner is also the Captain, as when a team is created.
        _teamId = _db.AddTeam(_owner,
            (_officer, TeamRole.Officer),
            (_player, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Officer_becomes_Owner_and_both_keep_their_roles()
    {
        var result = await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(_officer, _db.OwnerOf(_teamId));
        Assert.Equal(TeamRole.Officer, _db.RoleOf(_teamId, _officer));
        Assert.Equal(TeamRole.Captain, _db.RoleOf(_teamId, _owner));
    }

    [Fact]
    public async Task New_Owner_gets_Owner_rights_and_old_Owner_loses_them()
    {
        await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer);

        var byOldOwner = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _player, "Officer");
        Assert.Equal(ErrorType.Forbidden, byOldOwner.ErrorType);

        var byNewOwner = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _officer, _player, "Officer");
        Assert.True(byNewOwner.Success, byNewOwner.ErrorMessage);
    }

    [Fact]
    public async Task Old_Owner_who_stays_Captain_can_still_manage_the_team()
    {
        await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer);
        var invitee = _db.AddUser("invitee");

        var result = await _db.TeamService().InviteMemberAsync(_teamId, _owner, TestDatabase.EmailOf(invitee));

        Assert.True(result.Success, result.ErrorMessage);
    }

    [Fact]
    public async Task Only_Officers_can_receive_ownership()
    {
        var result = await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _player);

        Assert.False(result.Success);
        Assert.Equal(ErrorType.Validation, result.ErrorType);
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Cannot_transfer_to_someone_outside_the_team()
    {
        var outsider = _db.AddUser("outsider");

        var result = await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, outsider);

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Cannot_transfer_to_yourself()
    {
        var result = await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _owner);

        Assert.False(result.Success);
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Officer_who_already_owns_three_teams_cannot_take_a_fourth()
    {
        for (int i = 0; i < 3; i++)
            _db.AddTeam(_officer);

        var result = await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer);

        Assert.False(result.Success);
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Owner_is_not_a_role_that_can_be_given()
    {
        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, _owner, _officer, "Owner");

        Assert.False(result.Success);
        Assert.Equal(TeamRole.Officer, _db.RoleOf(_teamId, _officer));
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }
}
