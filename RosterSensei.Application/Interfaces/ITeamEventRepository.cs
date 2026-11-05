using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Interfaces;

public interface ITeamEventRepository
{
    // Events that overlap the [from, to) range.
    Task<List<TeamEvent>> GetEventsAsync(int teamId, DateTime from, DateTime to);
    Task<TeamEvent?> GetByIdAsync(int teamId, int eventId);
    Task<TeamEvent> AddAsync(TeamEvent teamEvent);
    // Saves an edit made from expectedVersion and moves the event to the next version.
    // Returns false when the event was changed or deleted by another request in the meantime.
    Task<bool> UpdateAsync(TeamEvent teamEvent, int expectedVersion);

    // Returns false when the event was deleted by another request in the meantime.
    Task<bool> DeleteAsync(int teamId, int eventId);
}
