using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CS2TeamManager.Domain.Entities;

public class Match
{
    public int Id { get; set; }

    [Required]
    public string OpponentName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Tournament { get; set; }

    public DateTime ScheduledDate { get; set; }
    public DateTime? PlayedDate { get; set; }
    public MatchStatus Status { get; set; }  // Scheduled, Live, Finished

    // Scores (CS2 best-of format)
    public int OurScore { get; set; }
    public int OpponentScore { get; set; }

    public int? BestOf { get; set; }  // e.g., 3

    public string Maps { get; set; } = string.Empty;  // JSON or comma: "Dust2,Mirage,Inferno"

    public string? Notes { get; set; }

    public int? TeamId { get; set; }
    public Team? Team { get; set; }

    public ICollection<MatchParticipation> Participations { get; set; } = new List<MatchParticipation>();
    public ICollection<MatchStat> TeamStats { get; set; } = new List<MatchStat>();
}

public enum MatchStatus
{
    Scheduled,
    Live,
    Finished,
    Cancelled
}
