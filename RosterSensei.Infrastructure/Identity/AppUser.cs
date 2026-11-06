using Microsoft.AspNetCore.Identity;
using RosterSensei.Domain.Entities;

namespace RosterSensei.Infrastructure.Identity;

public class AppUser : IdentityUser
{
    // SteamID64 of the linked Steam account, or null. Unique across users.
    public string? SteamId { get; set; }

    public ICollection<TeamMember> TeamMemberships { get; set; } = new List<TeamMember>();
    public ICollection<MatchParticipation> MatchParticipations { get; set; } = new List<MatchParticipation>();
    public ICollection<MatchStat> MatchStats { get; set; } = new List<MatchStat>();
}
