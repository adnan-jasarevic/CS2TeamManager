namespace RosterSensei.Domain.Entities;

// The API sends this as a string ("Win", "Loss" or "Draw") on every endpoint.
public enum MatchOutcome
{
    Win,
    Loss,
    Draw
}
