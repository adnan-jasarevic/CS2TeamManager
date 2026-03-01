using Microsoft.AspNetCore.Identity;
using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Infrastructure.Identity;

public class AppUser : IdentityUser
{
    // navigation property to team memberships
    public ICollection<TeamMember> TeamMemberships { get; set; } = new List<TeamMember>();
}
