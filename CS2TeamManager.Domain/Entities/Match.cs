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
    public MatchKind Type { get; set; }

    // Series score: rounds for a Bo1, maps won for a longer series
    public int OurScore { get; set; }
    public int OpponentScore { get; set; }

    public int? BestOf { get; set; }  // e.g., 3

    // Worked out from the series score, so every endpoint reports results the same way.
    public MatchOutcome Outcome =>
        OurScore > OpponentScore ? MatchOutcome.Win
        : OurScore < OpponentScore ? MatchOutcome.Loss
        : MatchOutcome.Draw;

    public string FinalScore => $"{OurScore} - {OpponentScore}";

    public ICollection<MatchMap> Maps { get; set; } = new List<MatchMap>();

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

public enum MatchKind
{
    Official,
    Scrim
}
