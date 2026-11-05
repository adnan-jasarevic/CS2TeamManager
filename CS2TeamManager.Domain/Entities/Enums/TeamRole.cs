namespace CS2TeamManager.Domain.Enums;

public enum TeamRole
{
    Owner = 0,
    Captain = 1,
    Player = 2,
    // Second-in-command. A team can have several Officers but only one Captain,
    // and ownership can only be transferred to an Officer.
    Officer = 3
}

public static class TeamRoleExtensions
{
    // Owner, Captain and Officers run the team day to day: invites, matches and the calendar.
    public static bool CanManageTeam(this TeamRole role) =>
        role == TeamRole.Owner || role == TeamRole.Captain || role == TeamRole.Officer;
}

