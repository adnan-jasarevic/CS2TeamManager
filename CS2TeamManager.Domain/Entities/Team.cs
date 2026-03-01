using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace CS2TeamManager.Domain.Entities
{
    public class Team
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relation to players through a join table (TeamMember)
        public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();

        // relation to matches
        public ICollection<Match> Matches { get; set; } = new List<Match>();
    }
}

