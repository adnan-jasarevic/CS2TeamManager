using System;
using System.Collections.Generic;
using System.Text;

namespace CS2TeamManager.Domain.Entities
{
    public class MatchParticipation
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;

        public int MatchId { get; set; }
        public Match Match { get; set; } = null!;

        public string Role { get; set; } = string.Empty;
        public bool Played { get; set; }
    }

}
