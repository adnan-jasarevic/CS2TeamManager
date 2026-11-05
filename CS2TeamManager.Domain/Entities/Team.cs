namespace CS2TeamManager.Domain.Entities
{
    public class Team
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();

        public ICollection<Match> Matches { get; set; } = new List<Match>();
        public ICollection<TeamInvite> Invites { get; set; } = new List<TeamInvite>(); 

    }
}

