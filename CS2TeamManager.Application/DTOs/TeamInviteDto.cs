namespace CS2TeamManager.Application.DTOs;

public class TeamInviteDto
{
    public int InviteId { get; set; }
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string SenderUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
