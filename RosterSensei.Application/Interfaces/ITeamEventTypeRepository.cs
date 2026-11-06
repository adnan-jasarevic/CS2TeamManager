using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Interfaces;

public interface ITeamEventTypeRepository
{
    Task<List<TeamEventType>> GetByTeamAsync(int teamId, CancellationToken cancellationToken = default);
    Task<TeamEventType?> GetByIdAsync(int teamId, int typeId);

    // Conflict when the team already has a type with that name or preset (for example two adds at once).
    Task<WriteOutcome> AddAsync(TeamEventType type);

    // Renames and recolours a type. Rejected when the type is gone or is "Other";
    // Conflict when another type already has the name.
    Task<WriteOutcome> UpdateAsync(int teamId, int typeId, string name, string color);

    // Moves the type's events to "Other", then deletes the type, in one transaction.
    // Rejected when the type is gone or is "Other"; Conflict when another request got in the way.
    Task<WriteOutcome> DeleteAsync(int teamId, int typeId);

    // The same for every type except "Other". Returns how many types were removed, or null on a conflict.
    Task<int?> DeleteAllExceptOtherAsync(int teamId);
}
