using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Application.Interfaces;

public interface ITeamEventRepository
{
    // Events that overlap the [from, to) range.
    Task<List<TeamEvent>> GetEventsAsync(int teamId, DateTime from, DateTime to);
    Task<TeamEvent?> GetByIdAsync(int teamId, int eventId);
    Task<TeamEvent> AddAsync(TeamEvent teamEvent);
    // Both return false when the event was deleted by another request in the meantime.
    Task<bool> UpdateAsync(TeamEvent teamEvent);
    Task<bool> DeleteAsync(int teamId, int eventId);
}
