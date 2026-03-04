namespace CS2TeamManager.Application.DTOs;

public class TeamDashboardDto
{
    public int TotalMatches { get; set; }
    public int WinRatePercentage { get; set; }
    public int TotalMembers { get; set; }
    public int UpcomingMatchesCount { get; set; }

    public List<MatchResponseDto> RecentMatches { get; set; } = new();
    public List<MatchResponseDto> UpcomingMatches { get; set; } = new();
}

public class MatchResponseDto
{
    public int Id { get; set; }
    public string OpponentName { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public string Status { get; set; } = string.Empty; // "Scheduled", "Finished"

    public string FinalScore { get; set; } = string.Empty;

    public string MatchOutcome { get; set; } = string.Empty;
}
