namespace RosterSensei.Domain.Entities;

// A kind of calendar event a team uses, such as Pracc or VOD Review. Each team keeps its own list,
// renames and recolours it, and adds custom types. Every team always has exactly one "Other" type,
// which can't be changed or removed: removed types hand their events over to it.
public class TeamEventType
{
    public int Id { get; set; }

    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    // "#rrggbb"
    public string Color { get; set; } = string.Empty;

    // Which premade type this row was made from, or null for a custom type. Kept when the type is renamed,
    // so the app still knows which type is the team's Scrim or Official Match.
    public EventTypePreset? Preset { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsOther => Preset == EventTypePreset.Other;
}

// Numbers 0 to 3 are the values the old fixed event type column held, so existing events map straight across.
public enum EventTypePreset
{
    Pracc = 0,
    OfficialMatch = 1,
    VodReview = 2,
    Other = 3,
    Scrim = 4,
    RecordedMatch = 5,
    Theory = 6,
    Break = 7,
    Warmup = 8,
    Meet = 9
}
