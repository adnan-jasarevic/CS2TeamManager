namespace RosterSensei.Application.Interfaces;

// How a guarded write ended, so the service can tell the user why nothing changed.
public enum WriteOutcome
{
    // The change was saved.
    Done,

    // A rule stopped it, for example the team limit or the one-Captain rule.
    Rejected,

    // The data changed underneath the request (another request won the race). Refreshing and retrying may work.
    Conflict
}
