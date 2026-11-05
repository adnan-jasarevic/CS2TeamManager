using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;
using RosterSensei.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace RosterSensei.Tests;

public class LeaveAndDeleteTeamTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _officer;
    private readonly string _player;
    private readonly int _teamId;

    public LeaveAndDeleteTeamTests()
    {
        _owner = _db.AddUser("owner");
        _officer = _db.AddUser("officer");
        _player = _db.AddUser("player");
        _teamId = _db.AddTeam(_owner, (_officer, TeamRole.Officer), (_player, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task A_player_can_leave_the_team()
    {
        var result = await _db.TeamService().LeaveTeamAsync(_teamId, _player);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(_db.RoleOf(_teamId, _player));
        Assert.Empty(await _db.TeamService().GetUserTeamsAsync(_player));
    }

    [Fact]
    public async Task The_Captain_can_leave_when_someone_else_owns_the_team()
    {
        var captain = _db.AddUser("captain");
        var teamId = _db.AddTeam(_owner, TeamRole.Officer, (captain, TeamRole.Captain));

        var result = await _db.TeamService().LeaveTeamAsync(teamId, captain);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(_db.RoleOf(teamId, captain));
    }

    [Fact]
    public async Task The_Owner_cannot_leave_without_transferring_ownership()
    {
        var result = await _db.TeamService().LeaveTeamAsync(_teamId, _owner);

        Assert.False(result.Success);
        Assert.Equal(ErrorType.Validation, result.ErrorType);
        Assert.Equal(TeamRole.Captain, _db.RoleOf(_teamId, _owner));
    }

    [Fact]
    public async Task The_old_Owner_can_leave_after_transferring_ownership()
    {
        Assert.True((await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer)).Success);

        var result = await _db.TeamService().LeaveTeamAsync(_teamId, _owner);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(_db.RoleOf(_teamId, _owner));
        Assert.Equal(_officer, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Leaving_a_team_you_are_not_in_is_not_found()
    {
        var outsider = _db.AddUser("outsider");

        var result = await _db.TeamService().LeaveTeamAsync(_teamId, outsider);

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }

    [Fact]
    public async Task The_Owner_can_delete_the_team_with_everything_in_it()
    {
        var invitee = _db.AddUser("invitee");
        Assert.True((await _db.TeamService().InviteMemberAsync(_teamId, _owner, TestDatabase.EmailOf(invitee))).Success);
        AddMatchAndEvent(_teamId);
        var otherTeam = _db.AddTeam(_officer);
        AddMatchAndEvent(otherTeam);

        var result = await _db.TeamService().DeleteTeamAsync(_teamId, _owner);

        Assert.True(result.Success, result.ErrorMessage);
        using var context = _db.CreateContext();
        Assert.False(await context.Teams.AnyAsync(t => t.Id == _teamId));
        Assert.False(await context.TeamMembers.AnyAsync(m => m.TeamId == _teamId));
        Assert.False(await context.TeamInvites.AnyAsync(i => i.TeamId == _teamId));
        Assert.False(await context.TeamEvents.AnyAsync(e => e.TeamId == _teamId));
        // No orphaned matches or maps are left behind, and the other team keeps its own.
        Assert.Equal(otherTeam, (await context.Matches.SingleAsync()).TeamId);
        Assert.Equal(1, await context.MatchMaps.CountAsync());
        Assert.Equal(1, await context.TeamEvents.CountAsync());
        Assert.Empty(await _db.TeamService().GetMyPendingInvitesAsync(invitee));
    }

    [Fact]
    public async Task Deleting_a_team_frees_a_slot_toward_the_three_team_limit()
    {
        var creator = _db.AddUser("creator");
        var teamIds = new List<int>();
        for (int i = 0; i < 3; i++)
            teamIds.Add((await _db.TeamService().CreateTeamAsync(creator, new CreateTeamDto { Name = $"Team {i}" })).Data!.Id);
        Assert.False((await _db.TeamService().CreateTeamAsync(creator, new CreateTeamDto { Name = "Team 4" })).Success);

        Assert.True((await _db.TeamService().DeleteTeamAsync(teamIds[0], creator)).Success);

        var fourth = await _db.TeamService().CreateTeamAsync(creator, new CreateTeamDto { Name = "Team 4" });
        Assert.True(fourth.Success, fourth.ErrorMessage);
    }

    [Theory]
    [InlineData("officer")]
    [InlineData("player")]
    public async Task Only_the_Owner_can_delete_the_team(string member)
    {
        var result = await _db.TeamService().DeleteTeamAsync(_teamId, member);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task The_Captain_who_is_not_the_Owner_cannot_delete_the_team()
    {
        var captain = _db.AddUser("captain");
        var teamId = _db.AddTeam(_owner, TeamRole.Officer, (captain, TeamRole.Captain));

        var result = await _db.TeamService().DeleteTeamAsync(teamId, captain);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
    }

    [Fact]
    public async Task Outsiders_cannot_delete_a_team()
    {
        var outsider = _db.AddUser("outsider");

        var result = await _db.TeamService().DeleteTeamAsync(_teamId, outsider);

        Assert.Equal(ErrorType.Forbidden, result.ErrorType);
    }

    [Fact]
    public async Task Deleting_a_missing_team_is_not_found()
    {
        var result = await _db.TeamService().DeleteTeamAsync(999, _owner);

        Assert.Equal(ErrorType.NotFound, result.ErrorType);
    }

    private void AddMatchAndEvent(int teamId)
    {
        using var context = _db.CreateContext();
        var match = new Match { OpponentName = "Rivals", TeamId = teamId, ScheduledDate = DateTime.UtcNow };
        match.Maps.Add(new MatchMap { Order = 1, MapName = "Mirage" });
        context.Matches.Add(match);
        context.TeamEvents.Add(new TeamEvent
        {
            TeamId = teamId,
            Title = "Practice",
            StartTime = DateTime.UtcNow,
            EndTime = DateTime.UtcNow.AddHours(2),
            CreatedByUserId = _owner
        });
        context.SaveChanges();
    }
}
