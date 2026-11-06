namespace RosterSensei.Domain.Entities;

// Something on the team's calendar: a practice, an official match, a VOD review...
public class TeamEvent
{
    public int Id { get; set; }

    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }

    // One of the team's own event types. Removing a type moves its events to the team's "Other" type.
    public int EventTypeId { get; set; }
    public TeamEventType EventType { get; set; } = null!;

    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Goes up by one on every edit. An edit sends the version it started from, so a save over
    // someone else's newer changes is refused instead of silently overwriting them.
    public int Version { get; set; }
}
