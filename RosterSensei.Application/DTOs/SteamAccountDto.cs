namespace RosterSensei.Application.DTOs;

public class SteamAccountDto
{
    // Null when no Steam account is linked.
    public string? SteamId { get; set; }
    public string? ProfileUrl { get; set; }
}
