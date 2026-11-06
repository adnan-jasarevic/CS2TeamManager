namespace RosterSensei.Application.DTOs;

// Body of PUT /api/Matches/{teamId}/{matchId}/lineup. Replaces the whole lineup; an empty list clears it.
public class SetMatchLineupDto
{
    public List<LineupPlayerDto> Players { get; set; } = new();
}

public class LineupPlayerDto
{
    public string UserId { get; set; } = string.Empty;
    // Free text, up to 30 characters. Empty or null means not recorded.
    public string? Role { get; set; }
    public bool Played { get; set; } = true;
}

public class MatchLineupEntryDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    // Null when not recorded.
    public string? Role { get; set; }
    public bool Played { get; set; }
}
