using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Tests.Infrastructure;

namespace CS2TeamManager.Tests;

// Officers are the Captain's extended hand: whatever a Captain may do, an Officer may do too.
// Owner-only actions (roles, removing players, transferring ownership, and later deleting the team)
// stay with the Owner.
public class RolePermissionTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _captain;
    private readonly string _officer;
    private readonly string _player;
    private readonly string _outsider;
    private readonly int _teamId;

    public RolePermissionTests()
    {
        _owner = _db.AddUser("owner");
        _captain = _db.AddUser("captain");
        _officer = _db.AddUser("officer");
        _player = _db.AddUser("player");
        _outsider = _db.AddUser("outsider");
        _teamId = _db.AddTeam(_owner,
            (_captain, TeamRole.Captain),
            (_officer, TeamRole.Officer),
            (_player, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    public static TheoryData<TeamRole, bool> ManageRights => new()
    {
        { TeamRole.Owner, true },
        { TeamRole.Captain, true },
        { TeamRole.Officer, true },
        { TeamRole.Player, false }
    };

    [Theory]
    [MemberData(nameof(ManageRights))]
    public void CanManageTeam_matches_role(TeamRole role, bool expected)
    {
        Assert.Equal(expected, role.CanManageTeam());
    }

    [Fact]
    public void Officer_has_the_same_manage_rights_as_Captain()
    {
        Assert.Equal(TeamRole.Captain.CanManageTeam(), TeamRole.Officer.CanManageTeam());
    }

    [Theory]
    [InlineData("owner", true)]
    [InlineData("captain", true)]
    [InlineData("officer", true)]
    [InlineData("player", false)]
    [InlineData("outsider", false)]
    public async Task Invite_players(string sender, bool allowed)
    {
        var invitee = _db.AddUser("invitee");

        var result = await _db.TeamService().InviteMemberAsync(_teamId, sender, TestDatabase.EmailOf(invitee));

        AssertAllowed(result, allowed);
    }

    [Theory]
    [InlineData("owner", true)]
    [InlineData("captain", true)]
    [InlineData("officer", true)]
    [InlineData("player", false)]
    [InlineData("outsider", false)]
    public async Task Add_matches(string userId, bool allowed)
    {
        var dto = new CreateMatchDto
        {
            OpponentName = "Rivals",
            ScheduledDate = DateTime.UtcNow.AddDays(1),
            Status = MatchStatus.Scheduled
        };

        var result = await _db.MatchService().AddMatchAsync(userId, _teamId, dto);

        AssertAllowed(result, allowed);
    }

    [Theory]
    [InlineData("owner", true)]
    [InlineData("captain", true)]
    [InlineData("officer", true)]
    [InlineData("player", false)]
    [InlineData("outsider", false)]
    public async Task Create_edit_and_delete_events(string userId, bool allowed)
    {
        // The event is created by the Owner so edit and delete can be checked for every role.
        var created = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc"));
        Assert.True(created.Success);

        AssertAllowed(await _db.EventService().CreateEventAsync(userId, _teamId, NewEvent("VOD review")), allowed);
        AssertAllowed(await _db.EventService().UpdateEventAsync(userId, _teamId, created.Data!.Id, NewEvent("Renamed")), allowed);
        AssertAllowed(await _db.EventService().DeleteEventAsync(userId, _teamId, created.Data!.Id), allowed);
    }

    [Theory]
    [InlineData("owner", true)]
    [InlineData("captain", true)]
    [InlineData("officer", true)]
    [InlineData("player", true)]
    [InlineData("outsider", false)]
    public async Task View_team_data_needs_membership(string userId, bool allowed)
    {
        AssertAllowed(await _db.TeamService().GetTeamMembersAsync(_teamId, userId), allowed);
        AssertAllowed(await _db.TeamService().GetTeamDashboardAsync(_teamId, userId), allowed);
        AssertAllowed(await _db.MatchService().GetTeamMatchesAsync(userId, _teamId), allowed);
        AssertAllowed(await _db.MatchService().GetTeamStatsAsync(userId, _teamId, null), allowed);
        AssertAllowed(await _db.EventService().GetEventsAsync(userId, _teamId, DateTime.UtcNow, DateTime.UtcNow.AddDays(7)), allowed);
    }

    [Theory]
    [InlineData("captain")]
    [InlineData("officer")]
    [InlineData("player")]
    public async Task Only_the_Owner_changes_roles(string userId)
    {
        var result = await _db.TeamService().ChangeMemberRoleAsync(_teamId, userId, _player, "Officer");

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _player));
    }

    [Theory]
    [InlineData("captain")]
    [InlineData("officer")]
    [InlineData("player")]
    public async Task Only_the_Owner_removes_other_players(string userId)
    {
        var target = userId == _player ? _captain : _player;

        var result = await _db.TeamService().RemoveMemberAsync(_teamId, userId, target);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        Assert.NotNull(_db.RoleOf(_teamId, target));
    }

    [Theory]
    [InlineData("captain")]
    [InlineData("officer")]
    [InlineData("player")]
    public async Task Only_the_Owner_transfers_ownership(string userId)
    {
        var result = await _db.TeamService().TransferOwnershipAsync(_teamId, userId, _officer);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        Assert.Equal(TeamRole.Owner, _db.RoleOf(_teamId, _owner));
    }

    private static SaveTeamEventDto NewEvent(string title) => new()
    {
        Title = title,
        StartTime = DateTime.UtcNow.AddDays(1),
        EndTime = DateTime.UtcNow.AddDays(1).AddHours(2),
        EventType = TeamEventType.Pracc
    };

    private static void AssertAllowed<T>(Result<T> result, bool allowed)
    {
        if (allowed)
        {
            Assert.True(result.Success, result.ErrorMessage);
        }
        else
        {
            Assert.False(result.Success);
            Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        }
    }
}
