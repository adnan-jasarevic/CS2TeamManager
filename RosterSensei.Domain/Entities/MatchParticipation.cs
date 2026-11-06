namespace RosterSensei.Domain.Entities;

// One player in a match's lineup.
public class MatchParticipation
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    // Free text, e.g. "IGL" or "AWPer". Null when the role wasn't recorded.
    public string? Role { get; set; }

    // False for a substitute who was in the lineup but didn't play.
    public bool Played { get; set; }
}
