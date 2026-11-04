namespace CS2TeamManager.Application.DTOs;

// Used both for creating a match and in match responses.
// Leave the scores empty for a map that was picked but not played.
public class MatchMapDto
{
    public string MapName { get; set; } = string.Empty;
    public int? OurScore { get; set; }
    public int? OpponentScore { get; set; }
    public int? OurFirstHalf { get; set; }
    public int? OpponentFirstHalf { get; set; }
    public int? OurSecondHalf { get; set; }
    public int? OpponentSecondHalf { get; set; }
}
