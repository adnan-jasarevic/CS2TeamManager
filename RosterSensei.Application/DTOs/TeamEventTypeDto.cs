namespace RosterSensei.Application.DTOs;

public class TeamEventTypeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;

    // The premade type this was made from ("Pracc", "Scrim", "RecordedMatch", "Other"...), or null for a custom type.
    public string? Preset { get; set; }

    // True for "Other", which can't be edited or removed.
    public bool IsLocked { get; set; }
}

public class EventTypePresetDto
{
    public string Preset { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class TeamEventTypesDto
{
    public List<TeamEventTypeDto> Types { get; set; } = new();

    // Premade types the team doesn't have right now and can add.
    public List<EventTypePresetDto> AvailablePresets { get; set; } = new();
}

// Used for both creating a custom type and editing any type except "Other".
public class SaveTeamEventTypeDto
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}
