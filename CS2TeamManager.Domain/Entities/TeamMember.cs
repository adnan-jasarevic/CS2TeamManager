using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Domain.Entities;

public class TeamMember
{
    public string UserId { get; set; } = string.Empty;
    // The Identity user (AppUser) lives in Infrastructure, so the Domain only keeps its ID.

    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public TeamRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Both need Team to be loaded.
    public bool IsOwner => Team.OwnerId == UserId;
    public bool CanManageTeam => IsOwner || Role.CanManageTeam();
}
