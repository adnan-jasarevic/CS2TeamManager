namespace RosterSensei.Domain.Entities
{
    public class MatchParticipation
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;

        public int MatchId { get; set; }
        public Match Match { get; set; } = null!;

        public string Role { get; set; } = string.Empty;
        public bool Played { get; set; }
    }

}
