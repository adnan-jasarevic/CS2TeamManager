using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Interfaces;

public interface ITeamOffDayRepository
{
    // Off days that overlap the [from, to) range.
    Task<List<TeamOffDay>> GetAsync(int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default);

    // Returns false when the day was already marked (by an earlier or a simultaneous request).
    Task<bool> AddAsync(TeamOffDay offDay);

    // Returns false when the day wasn't marked.
    Task<bool> DeleteAsync(int teamId, DateOnly date);
}
