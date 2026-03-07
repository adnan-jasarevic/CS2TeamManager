using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Domain.Entities;

public class TeamInvite
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public string TargetUserEmail { get; set; } = string.Empty;
    public string? TargetUserId { get; set; } // can be null in case we want to invite someone who hasnt made an account yet

    public string SenderUserId { get; set; } = string.Empty;

    public InviteStatus Status { get; set; } = InviteStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}