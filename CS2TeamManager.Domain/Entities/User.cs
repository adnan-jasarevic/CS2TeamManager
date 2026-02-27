using System.ComponentModel.DataAnnotations;

namespace CS2TeamManager.Domain.Entities;

public class User
{
    public string Id { get; set; } = string.Empty;  // IdentityUser.Id
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;  

    public string? SteamId { get; set; }  

    public int? CurrentTeamId { get; set; }
    public Team? CurrentTeam { get; set; }

    public ICollection<MatchParticipation> MatchParticipations { get; set; } = new List<MatchParticipation>();
    public ICollection<MatchStat> PersonalStats { get; set; } = new List<MatchStat>();
}
