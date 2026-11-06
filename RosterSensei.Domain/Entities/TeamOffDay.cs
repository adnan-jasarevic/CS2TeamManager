namespace RosterSensei.Domain.Entities;

// A day the team doesn't play: no new events can be put on it, and events already on it show as cancelled.
public class TeamOffDay
{
    public int Id { get; set; }

    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    // The calendar day as the person who marked it saw it.
    public DateOnly Date { get; set; }

    // That day's midnight-to-midnight in UTC, worked out in the marking person's time zone,
    // so checks against event times (stored in UTC) are exact.
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
