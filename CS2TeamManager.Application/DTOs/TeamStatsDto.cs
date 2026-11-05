namespace CS2TeamManager.Application.DTOs;

public class TeamStatsDto
{
    public int MatchesPlayed { get; set; }
    public int MapsPlayed { get; set; }
    public List<MapStatsDto> Maps { get; set; } = new();
    // One point per finished match, oldest first.
    public List<FormPointDto> Form { get; set; } = new();
}

public class MapStatsDto
{
    public string MapName { get; set; } = string.Empty;
    public int Played { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public int RoundsWon { get; set; }
    public int RoundsLost { get; set; }
    public int WinRatePercentage { get; set; }
}

public class FormPointDto
{
    public int MatchId { get; set; }
    public DateTime Date { get; set; }
    public string OpponentName { get; set; } = string.Empty;
    public string MatchOutcome { get; set; } = string.Empty; // "Win", "Loss" or "Draw"
    // Win rate over every match up to and including this one.
    public int WinRatePercentage { get; set; }
}
