namespace CS2TeamManager.Application.DTOs;

public class MatchDto
{
    public int Id { get; set; }
    public string OpponentName { get; set; } = string.Empty;
    public string? Tournament { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? PlayedDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "Official", "Scrim"
    public string FinalScore { get; set; } = string.Empty;
    public int? BestOf { get; set; }
    public List<MatchMapDto> Maps { get; set; } = new List<MatchMapDto>();
    public string MatchOutcome { get; set; } = string.Empty; // "Win", "Loss", "Draw"
    public string? Notes { get; set; }
}
