namespace RosterSensei.Domain.Enums;

// The Owner isn't a role: ownership is kept on the Team, so the Owner also has one of these roles
// (Captain by default, for whoever creates the team).
public enum TeamRole
{
    Captain = 1,
    Player = 2,
    // Second-in-command. A team can have several Officers but only one Captain,
    // and ownership can only be transferred to an Officer.
    Officer = 3
}

public static class TeamRoleExtensions
{
    // The Captain and Officers run the team day to day: invites, matches and the calendar.
    // Officers have the same rights as the Captain. The Owner can always do this too, whatever their role.
    public static bool CanManageTeam(this TeamRole role) =>
        role == TeamRole.Captain || role == TeamRole.Officer;
}

