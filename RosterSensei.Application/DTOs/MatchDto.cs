namespace RosterSensei.Application.DTOs;

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
    public string MatchOutcome { get; set; } = string.Empty; // "Win", "Loss" or "Draw"
    public string? Notes { get; set; }
    // Who was in the lineup. Empty when it wasn't recorded.
    public List<MatchLineupEntryDto> Lineup { get; set; } = new List<MatchLineupEntryDto>();
}
