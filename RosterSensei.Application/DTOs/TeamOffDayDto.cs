namespace RosterSensei.Application.DTOs;

public class TeamOffDayDto
{
    public DateOnly Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

// The day's local midnight-to-midnight in UTC, from the browser of the person marking it.
public class SaveTeamOffDayDto
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}
