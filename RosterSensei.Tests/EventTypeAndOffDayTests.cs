using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;
using RosterSensei.Infrastructure.Repositories;
using RosterSensei.Tests.Infrastructure;

namespace RosterSensei.Tests;

public class EventTypeAndOffDayTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly string _officer;
    private readonly string _player;
    private readonly int _teamId;

    // A fixed day in the future, as a UTC+1 browser would send it.
    private static readonly DateOnly OffDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10));
    private static readonly DateTime OffStart = OffDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddHours(-1);
    private static readonly DateTime OffEnd = OffStart.AddDays(1);

    public EventTypeAndOffDayTests()
    {
        _owner = _db.AddUser("owner");
        _officer = _db.AddUser("officer");
        _player = _db.AddUser("player");
        _teamId = _db.AddTeam(_owner, (_officer, TeamRole.Officer), (_player, TeamRole.Player));
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task A_new_team_starts_with_the_default_types_and_Other_last()
    {
        var created = await _db.TeamService().CreateTeamAsync(_player, new CreateTeamDto { Name = "Fresh Team" });
        var types = await _db.EventTypeService().GetAsync(_player, created.Data!.Id);

        Assert.Equal(["Pracc", "Official Match", "VOD Review", "Theory", "Other"], types.Data!.Types.Select(t => t.Name));
        Assert.True(types.Data.Types[^1].IsLocked);
        Assert.Equal(["Scrim", "Recorded Match", "Break", "Warmup", "Meet"], types.Data.AvailablePresets.Select(p => p.Name));
    }

    [Fact]
    public async Task Other_cannot_be_renamed_or_removed()
    {
        var otherId = _db.TypeId(_teamId, EventTypePreset.Other);

        var rename = await _db.EventTypeService().UpdateAsync(_owner, _teamId, otherId, new SaveTeamEventTypeDto { Name = "Misc", Color = "#000000" });
        var remove = await _db.EventTypeService().DeleteAsync(_owner, _teamId, otherId);

        Assert.False(rename.Success);
        Assert.False(remove.Success);
        // The repository refuses on its own too.
        Assert.Equal(WriteOutcome.Rejected, await new TeamEventTypeRepository(_db.CreateContext()).UpdateAsync(_teamId, otherId, "Misc", "#000000"));
        Assert.Equal(WriteOutcome.Rejected, await new TeamEventTypeRepository(_db.CreateContext()).DeleteAsync(_teamId, otherId));
        Assert.Equal("Other", (await _db.EventTypeService().GetAsync(_owner, _teamId)).Data!.Types.Single(t => t.IsLocked).Name);
    }

    [Fact]
    public async Task Removing_a_type_moves_its_events_to_Other()
    {
        var praccId = _db.TypeId(_teamId, EventTypePreset.Pracc);
        var created = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc vs Tokyo", praccId));

        var removed = await _db.EventTypeService().DeleteAsync(_officer, _teamId, praccId);

        Assert.True(removed.Success, removed.ErrorMessage);
        var moved = Assert.Single(await Events());
        Assert.Equal(_db.TypeId(_teamId, EventTypePreset.Other), moved.EventTypeId);
        // An editor still open on the old version must reload rather than save the removed type back.
        Assert.Equal(created.Data!.Version + 1, moved.Version);
    }

    [Fact]
    public async Task Removing_every_type_leaves_only_Other_and_keeps_all_events()
    {
        await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("A", _db.TypeId(_teamId, EventTypePreset.Pracc)));
        await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("B", _db.TypeId(_teamId, EventTypePreset.VodReview)));
        await _db.EventTypeService().CreateCustomAsync(_owner, _teamId, new SaveTeamEventTypeDto { Name = "Bootcamp", Color = "#123456" });

        var result = await _db.EventTypeService().DeleteAllAsync(_owner, _teamId);

        Assert.True(result.Success, result.ErrorMessage);
        var types = (await _db.EventTypeService().GetAsync(_owner, _teamId)).Data!;
        var other = Assert.Single(types.Types);
        Assert.True(other.IsLocked);
        Assert.All(await Events(), e => Assert.Equal(other.Id, e.EventTypeId));
        Assert.Equal(2, (await Events()).Count);
        Assert.Equal(9, types.AvailablePresets.Count);
    }

    [Fact]
    public async Task Removed_premade_types_can_be_added_back_once()
    {
        await _db.EventTypeService().DeleteAsync(_owner, _teamId, _db.TypeId(_teamId, EventTypePreset.Pracc));

        var first = await _db.EventTypeService().AddPresetAsync(_officer, _teamId, "Pracc");
        var second = await _db.EventTypeService().AddPresetAsync(_officer, _teamId, "Pracc");
        var other = await _db.EventTypeService().AddPresetAsync(_officer, _teamId, "Other");

        Assert.True(first.Success, first.ErrorMessage);
        Assert.Equal("Pracc", first.Data!.Preset);
        Assert.False(second.Success);
        Assert.False(other.Success);
    }

    [Fact]
    public async Task A_duplicate_added_at_the_same_moment_is_caught_by_the_database()
    {
        await _db.EventTypeService().AddPresetAsync(_owner, _teamId, "Scrim");

        // The second request checked before the first one saved.
        var outcome = await new TeamEventTypeRepository(_db.CreateContext()).AddAsync(new TeamEventType
        {
            TeamId = _teamId, Name = "Scrim 2", Color = "#000000", Preset = EventTypePreset.Scrim
        });

        Assert.Equal(WriteOutcome.Conflict, outcome);
    }

    [Fact]
    public async Task Type_names_are_unique_in_a_team_ignoring_case()
    {
        var result = await _db.EventTypeService().CreateCustomAsync(_owner, _teamId, new SaveTeamEventTypeDto { Name = "pracc", Color = "#123456" });

        Assert.False(result.Success);
    }

    [Fact]
    public async Task A_renamed_premade_type_keeps_its_preset()
    {
        var id = _db.TypeId(_teamId, EventTypePreset.OfficialMatch);

        var result = await _db.EventTypeService().UpdateAsync(_owner, _teamId, id, new SaveTeamEventTypeDto { Name = "ESEA", Color = "#abcdef" });

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal("OfficialMatch", result.Data!.Preset);
        Assert.Equal("#ABCDEF", result.Data.Color);
    }

    [Fact]
    public async Task Players_see_types_and_off_days_but_cannot_change_them()
    {
        Assert.True((await _db.EventTypeService().GetAsync(_player, _teamId)).Success);
        Assert.True((await _db.OffDayService().GetAsync(_player, _teamId, OffStart, OffEnd)).Success);

        Assert.Equal(ErrorType.Forbidden, (await _db.EventTypeService().CreateCustomAsync(_player, _teamId, new SaveTeamEventTypeDto { Name = "X", Color = "#000000" })).ErrorType);
        Assert.Equal(ErrorType.Forbidden, (await _db.EventTypeService().DeleteAllAsync(_player, _teamId)).ErrorType);
        Assert.Equal(ErrorType.Forbidden, (await _db.OffDayService().MarkAsync(_player, _teamId, OffDate, OffDayTimes())).ErrorType);
    }

    [Fact]
    public async Task An_event_cannot_use_another_teams_type()
    {
        var otherTeam = _db.AddTeam(_db.AddUser("rival"));

        var result = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Sneaky", _db.TypeId(otherTeam, EventTypePreset.Pracc)));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task An_event_saved_with_a_type_removed_meanwhile_is_refused()
    {
        var praccId = _db.TypeId(_teamId, EventTypePreset.Pracc);
        await _db.EventTypeService().DeleteAsync(_owner, _teamId, praccId);

        // The create request checked the type just before it was removed.
        var saved = await new TeamEventRepository(_db.CreateContext()).AddAsync(new TeamEvent
        {
            TeamId = _teamId, Title = "Late", StartTime = DateTime.UtcNow, EndTime = DateTime.UtcNow.AddHours(1),
            EventTypeId = praccId, CreatedByUserId = _owner
        });

        Assert.Null(saved);
    }

    [Fact]
    public async Task No_new_event_can_go_on_an_off_day()
    {
        Assert.True((await _db.OffDayService().MarkAsync(_officer, _teamId, OffDate, OffDayTimes())).Success);

        var result = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc", Pracc(), OffStart.AddHours(19)));

        Assert.Equal(ErrorType.Validation, result.ErrorType);
        Assert.Empty(await Events());
    }

    [Fact]
    public async Task Events_already_on_a_day_marked_off_stay_and_can_still_be_edited_but_not_moved_there()
    {
        var onTheDay = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("On the day", Pracc(), OffStart.AddHours(19)));
        var dayBefore = await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Day before", Pracc(), OffStart.AddHours(-5)));

        Assert.True((await _db.OffDayService().MarkAsync(_owner, _teamId, OffDate, OffDayTimes())).Success);

        Assert.Equal(2, (await Events()).Count);

        var rename = NewEvent("Renamed", Pracc(), OffStart.AddHours(19));
        rename.Version = onTheDay.Data!.Version;
        Assert.True((await _db.EventService().UpdateEventAsync(_owner, _teamId, onTheDay.Data.Id, rename)).Success);

        var move = NewEvent("Day before", Pracc(), OffStart.AddHours(12));
        move.Version = dayBefore.Data!.Version;
        Assert.Equal(ErrorType.Validation, (await _db.EventService().UpdateEventAsync(_owner, _teamId, dayBefore.Data.Id, move)).ErrorType);
    }

    [Fact]
    public async Task Marking_a_day_twice_is_fine_and_unmarking_frees_it()
    {
        Assert.True((await _db.OffDayService().MarkAsync(_owner, _teamId, OffDate, OffDayTimes())).Success);
        Assert.True((await _db.OffDayService().MarkAsync(_officer, _teamId, OffDate, OffDayTimes())).Success);
        Assert.Single((await _db.OffDayService().GetAsync(_owner, _teamId, OffStart, OffEnd)).Data!);

        Assert.True((await _db.OffDayService().UnmarkAsync(_officer, _teamId, OffDate)).Success);
        Assert.Equal(ErrorType.NotFound, (await _db.OffDayService().UnmarkAsync(_officer, _teamId, OffDate)).ErrorType);

        Assert.True((await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc", Pracc(), OffStart.AddHours(19)))).Success);
    }

    [Fact]
    public async Task Off_day_times_far_from_the_date_are_refused()
    {
        var result = await _db.OffDayService().MarkAsync(_owner, _teamId, OffDate, new SaveTeamOffDayDto
        {
            StartTime = OffStart.AddDays(3),
            EndTime = OffEnd.AddDays(3)
        });

        Assert.Equal(ErrorType.Validation, result.ErrorType);
    }

    [Fact]
    public async Task Deleting_a_team_removes_its_types_events_and_off_days()
    {
        await _db.EventService().CreateEventAsync(_owner, _teamId, NewEvent("Pracc", Pracc()));
        await _db.OffDayService().MarkAsync(_owner, _teamId, OffDate, OffDayTimes());

        var result = await _db.TeamService().DeleteTeamAsync(_teamId, _owner);

        Assert.True(result.Success, result.ErrorMessage);
        using var context = _db.CreateContext();
        Assert.False(context.TeamEventTypes.Any(t => t.TeamId == _teamId));
        Assert.False(context.TeamEvents.Any(e => e.TeamId == _teamId));
        Assert.False(context.TeamOffDays.Any(d => d.TeamId == _teamId));
    }

    private int Pracc() => _db.TypeId(_teamId, EventTypePreset.Pracc);

    private static SaveTeamOffDayDto OffDayTimes() => new() { StartTime = OffStart, EndTime = OffEnd };

    private async Task<List<TeamEventDto>> Events() =>
        (await _db.EventService().GetEventsAsync(_owner, _teamId, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(30))).Data!;

    private static SaveTeamEventDto NewEvent(string title, int typeId, DateTime? start = null)
    {
        var from = start ?? DateTime.UtcNow.AddDays(1);
        return new SaveTeamEventDto { Title = title, StartTime = from, EndTime = from.AddHours(2), EventTypeId = typeId };
    }
}
