using System;
using System.Collections.Generic;
using System.Text;

namespace CS2TeamManager.Application.DTOs
{
    public class TeamDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string CurrentUserRole { get; set; } = string.Empty;
    }
}
