using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Application.DTOs;

public class CreateMatchDto
{
    public string OpponentName { get; set; } = string.Empty;
    public string? Tournament { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? PlayedDate { get; set; }
    public MatchStatus Status { get; set; }
    public int OurScore { get; set; }
    public int OpponentScore { get; set; }
    public int? BestOf { get; set; }
    public List<string> Maps { get; set; } = new List<string>();
    public string? Notes { get; set; }
}
