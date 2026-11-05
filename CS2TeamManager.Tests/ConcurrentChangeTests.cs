using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;
using CS2TeamManager.Infrastructure.Repositories;
using CS2TeamManager.Tests.Infrastructure;

namespace CS2TeamManager.Tests;

// The services check permissions first and then write. These tests play the second request of a race:
// they call the repository's guarded writes with what the service saw before another request changed
// the data, and check that the write refuses instead of acting on stale state.
public class ConcurrentChangeTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _officer;
    private readonly string _player;
    private readonly int _teamId;

    public ConcurrentChangeTests()
    {
        _owner = _db.AddUser("owner");
        _officer = _db.AddUser("officer");
        _player = _db.AddUser("player");
        _teamId = _db.AddTeam(_owner, (_officer, TeamRole.Officer), (_player, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    private TeamRepository Repository() => new(_db.CreateContext());

    [Fact]
    public async Task Former_Owner_cannot_remove_a_player_after_handing_the_team_on()
    {
        Assert.True((await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer)).Success);

        // The old Owner's remove request passed its permission check just before the transfer.
        Assert.False(await Repository().RemoveMemberAsync(_teamId, _player, _owner));

        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task Removing_a_player_keeps_an_ownership_transfer_made_meanwhile()
    {
        // Removing used to save the whole team loaded at the start of the request, OwnerId included,
        // which could write the old Owner back over a transfer. Now only the member row is deleted.
        await using var staleContext = _db.CreateContext();
        var staleRepository = new TeamRepository(staleContext);
        var staleTeam = await staleRepository.GetByIdAsync(_teamId);
        Assert.Equal(_owner, staleTeam!.OwnerId);

        Assert.True((await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer)).Success);
        await staleRepository.RemoveMemberAsync(_teamId, _player, _player);

        Assert.Equal(_officer, _db.OwnerOf(_teamId));
        Assert.Null(_db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task A_member_who_just_became_Owner_cannot_be_removed()
    {
        Assert.True((await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer)).Success);

        Assert.False(await Repository().RemoveMemberAsync(_teamId, _officer, _owner));
        Assert.False(await Repository().RemoveMemberAsync(_teamId, _officer, _officer));

        Assert.Equal(TeamRole.Officer, _db.RoleOf(_teamId, _officer));
    }

    [Fact]
    public async Task Former_Owner_cannot_change_roles_after_handing_the_team_on()
    {
        Assert.True((await _db.TeamService().TransferOwnershipAsync(_teamId, _owner, _officer)).Success);

        var outcome = await Repository().ChangeMemberRoleAsync(_teamId, _owner, _player, TeamRole.Officer);

        Assert.Equal(WriteOutcome.Conflict, outcome);
        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task A_second_Captain_made_at_the_same_time_is_rejected()
    {
        // The service saw no other Captain, but the database already has one (the Owner).
        var outcome = await Repository().ChangeMemberRoleAsync(_teamId, _owner, _player, TeamRole.Captain);

        Assert.Equal(WriteOutcome.Rejected, outcome);
        Assert.Equal(TeamRole.Player, _db.RoleOf(_teamId, _player));
    }

    [Fact]
    public async Task Creating_a_team_past_the_limit_is_rejected_by_the_write_itself()
    {
        for (int i = 0; i < 2; i++)
            _db.AddTeam(_owner);

        var outcome = await Repository().AddOwnedTeamAsync(new Team { Name = "Fourth", OwnerId = _owner }, maxOwnedTeams: 3);

        Assert.Equal(WriteOutcome.Rejected, outcome);
    }

    [Fact]
    public async Task Transfer_to_an_Officer_who_reached_the_limit_is_rejected_by_the_write_itself()
    {
        for (int i = 0; i < 3; i++)
            _db.AddTeam(_officer);

        var outcome = await Repository().TransferOwnershipAsync(_teamId, _owner, _officer, maxOwnedTeams: 3);

        Assert.Equal(WriteOutcome.Rejected, outcome);
        Assert.Equal(_owner, _db.OwnerOf(_teamId));
    }

    [Fact]
    public async Task Deleting_an_event_twice_returns_not_found_the_second_time()
    {
        var created = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc"));

        Assert.True((await _db.EventService().DeleteEventAsync(_officer, _teamId, created.Data!.Id)).Success);
        var second = await _db.EventService().DeleteEventAsync(_owner, _teamId, created.Data.Id);

        Assert.Equal(ErrorType.NotFound, second.ErrorType);
    }

    [Fact]
    public async Task Saving_an_event_deleted_meanwhile_returns_not_found()
    {
        var created = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc"));

        // The edit loaded the event, then someone else deleted it before the save.
        await using var context = _db.CreateContext();
        var repository = new TeamEventRepository(context);
        var loaded = await repository.GetByIdAsync(_teamId, created.Data!.Id);
        Assert.True((await _db.EventService().DeleteEventAsync(_officer, _teamId, created.Data.Id)).Success);

        loaded!.Title = "Renamed";

        Assert.False(await repository.UpdateAsync(loaded));
    }

    private static SaveTeamEventDto NewEvent(string title) => new()
    {
        Title = title,
        StartTime = DateTime.UtcNow.AddDays(1),
        EndTime = DateTime.UtcNow.AddDays(1).AddHours(2),
        EventType = TeamEventType.Pracc
    };
}
