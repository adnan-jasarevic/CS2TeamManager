using CS2TeamManager.Application.Common;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Tests.Infrastructure;

namespace CS2TeamManager.Tests;

public class InviteTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _invitee;
    private readonly int _teamId;

    public InviteTests()
    {
        _owner = _db.AddUser("owner");
        _invitee = _db.AddUser("invitee");
        _teamId = _db.AddTeam(_owner);
    }

    public void Dispose() => _db.Dispose();

    private async Task<int> SendInviteAsync()
    {
        var sent = await _db.TeamService().InviteMemberAsync(_teamId, _owner, TestDatabase.EmailOf(_invitee));
        Assert.True(sent.Success, sent.ErrorMessage);

        var pending = await _db.TeamService().GetMyPendingInvitesAsync(_invitee);
        return Assert.Single(pending).InviteId;
    }

    [Fact]
    public async Task Invite_shows_up_for_the_invitee_with_team_and_sender()
    {
        await SendInviteAsync();

        var invite = Assert.Single(await _db.TeamService().GetMyPendingInvitesAsync(_invitee));
        Assert.Equal(_teamId, invite.TeamId);
        Assert.Equal("Team of owner", invite.TeamName);
        Assert.Equal("owner", invite.SenderUsername);
    }

    [Fact]
    public async Task Accepting_joins_the_team_as_a_Player()
    {
        var inviteId = await SendInviteAsync();

        var result = await _db.TeamService().RespondToInviteAsync(inviteId, _invitee, isAccepted: true);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _invitee));
        Assert.Empty(await _db.TeamService().GetMyPendingInvitesAsync(_invitee));
    }

    [Fact]
    public async Task Declining_does_not_join_the_team()
    {
        var inviteId = await SendInviteAsync();

        var result = await _db.TeamService().RespondToInviteAsync(inviteId, _invitee, isAccepted: false);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(_db.RoleOf(_teamId, _invitee));
        Assert.Empty(await _db.TeamService().GetMyPendingInvitesAsync(_invitee));
    }

    [Fact]
    public async Task Declined_user_can_be_invited_again()
    {
        var inviteId = await SendInviteAsync();
        await _db.TeamService().RespondToInviteAsync(inviteId, _invitee, isAccepted: false);

        await SendInviteAsync();
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(false, false)]
    public async Task An_invite_can_only_be_answered_once(bool first, bool second)
    {
        var inviteId = await SendInviteAsync();
        Assert.True((await _db.TeamService().RespondToInviteAsync(inviteId, _invitee, first)).Success);

        var again = await _db.TeamService().RespondToInviteAsync(inviteId, _invitee, second);

        Assert.False(again.Success);
        Assert.Equal(ErrorType.Validation, again.ErrorType);
        Assert.Equal(first ? TeamRole.Player : null, _db.RoleOf(_teamId, _invitee));
    }

    [Fact]
    public async Task Only_the_invitee_can_answer()
    {
        var inviteId = await SendInviteAsync();
        var someoneElse = _db.AddUser("someone");

        var result = await _db.TeamService().RespondToInviteAsync(inviteId, someoneElse, isAccepted: true);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        Assert.Null(_db.RoleOf(_teamId, someoneElse));
    }

    [Fact]
    public async Task Answering_a_missing_invite_is_not_found()
    {
        var result = await _db.TeamService().RespondToInviteAsync(999, _invitee, isAccepted: true);

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }

    [Fact]
    public async Task A_second_pending_invite_is_rejected()
    {
        await SendInviteAsync();

        var result = await _db.TeamService().InviteMemberAsync(_teamId, _owner, TestDatabase.EmailOf(_invitee));

        Assert.False(result.Success);
        Assert.Single(await _db.TeamService().GetMyPendingInvitesAsync(_invitee));
    }

    [Fact]
    public async Task Existing_members_cannot_be_invited()
    {
        var inviteId = await SendInviteAsync();
        await _db.TeamService().RespondToInviteAsync(inviteId, _invitee, isAccepted: true);

        var result = await _db.TeamService().InviteMemberAsync(_teamId, _owner, TestDatabase.EmailOf(_invitee));

        Assert.False(result.Success);
        Assert.Equal(ErrorType.Validation, result.ErrorType);
    }

    [Fact]
    public async Task You_cannot_invite_yourself()
    {
        var result = await _db.TeamService().InviteMemberAsync(_teamId, _owner, TestDatabase.EmailOf(_owner));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Unregistered_email_is_not_found()
    {
        var result = await _db.TeamService().InviteMemberAsync(_teamId, _owner, "nobody@example.com");

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }
}
