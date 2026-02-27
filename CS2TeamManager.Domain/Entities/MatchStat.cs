using System;
using System.Collections.Generic;
using System.Text;

namespace CS2TeamManager.Domain.Entities
{
    public class MatchStat
    {
        public int Id { get; set; }

        public string StatType { get; set; } = string.Empty;  // "Kills", "Deaths", "ADR", "HS%"
        public double Value { get; set; }

        public string? UserId { get; set; }  // Null for team aggregate
        public User? User { get; set; }

        public int MatchId { get; set; }
        public Match Match { get; set; } = null!;
    }

}
