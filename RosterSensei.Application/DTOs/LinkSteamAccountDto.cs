namespace RosterSensei.Application.DTOs;

public class LinkSteamAccountDto
{
    // A SteamID64, a steamcommunity.com/profiles/ URL, or a STEAM_0:X:Y or [U:1:N] ID.
    public string Steam { get; set; } = string.Empty;
}
