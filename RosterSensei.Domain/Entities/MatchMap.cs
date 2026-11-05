namespace RosterSensei.Domain.Entities;

// One map played (or picked) in a match. Halves are MR12, so anything past them is overtime.
public class MatchMap
{
    public int Id { get; set; }

    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    // Position in the series: 1 for the first map, 2 for the second, and so on.
    public int Order { get; set; }

    public string MapName { get; set; } = string.Empty;

    // Null until the map has been played.
    public int? OurScore { get; set; }
    public int? OpponentScore { get; set; }

    public int? OurFirstHalf { get; set; }
    public int? OpponentFirstHalf { get; set; }
    public int? OurSecondHalf { get; set; }
    public int? OpponentSecondHalf { get; set; }
}
