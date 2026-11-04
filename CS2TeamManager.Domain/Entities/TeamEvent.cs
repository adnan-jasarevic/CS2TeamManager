namespace CS2TeamManager.Domain.Entities;

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

    public TeamEventType EventType { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum TeamEventType
{
    Pracc,
    OfficialMatch,
    VodReview,
    Other
}
