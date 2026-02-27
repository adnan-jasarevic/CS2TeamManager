using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace CS2TeamManager.Domain.Entities
{
    public class Team
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string CaptainId { get; set; }
        public List<User> Members { get; set; } = new();
        public List<Match> Matches { get; set; } = new();
    }
}
