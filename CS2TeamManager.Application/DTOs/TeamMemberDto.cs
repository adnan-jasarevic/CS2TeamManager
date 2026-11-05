namespace CS2TeamManager.Application.DTOs;

public class TeamMemberDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsOwner { get; set; }
    public DateTime JoinedAt { get; set; }
}
