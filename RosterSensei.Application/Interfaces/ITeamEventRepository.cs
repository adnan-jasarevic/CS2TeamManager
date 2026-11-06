using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Interfaces;

public interface ITeamEventRepository
{
    // Events that overlap the [from, to) range.
    Task<List<TeamEvent>> GetEventsAsync(int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<TeamEvent?> GetByIdAsync(int teamId, int eventId);
    // Returns null when the save failed because the event's type was removed in the meantime.
    Task<TeamEvent?> AddAsync(TeamEvent teamEvent);
    // Saves an edit made from expectedVersion and moves the event to the next version.
    // Returns false when the event was changed or deleted by another request in the meantime,
    // or its new type was removed.
    Task<bool> UpdateAsync(TeamEvent teamEvent, int expectedVersion);

    Task<bool> EventTypeExistsAsync(int teamId, int typeId);

    // The first off day that overlaps [start, end), if any.
    Task<TeamOffDay?> GetOverlappingOffDayAsync(int teamId, DateTime start, DateTime end);

    // Returns false when the event was deleted by another request in the meantime.
    Task<bool> DeleteAsync(int teamId, int eventId);
}
