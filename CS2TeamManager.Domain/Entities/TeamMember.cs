using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Domain.Entities;

public class TeamMember
{
    public string UserId { get; set; } = string.Empty;
    // AppUser comes from the identity layer, which is in the Infra layer, so the Domain layer doesn't know about AppUser directly.

    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public TeamRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
