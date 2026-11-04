using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Application.DTOs;

public class TeamEventDto
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string EventType { get; set; } = string.Empty; // "Pracc", "OfficialMatch", "VodReview", "Other"
}

// Used for both creating and editing an event.
public class SaveTeamEventDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public TeamEventType EventType { get; set; }
}
