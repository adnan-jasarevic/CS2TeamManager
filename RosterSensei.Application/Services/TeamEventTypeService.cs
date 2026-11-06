using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;

namespace RosterSensei.Application.Services;

public class TeamEventTypeService : ITeamEventTypeService
{
    // Plenty for a calendar legend, and keeps the event form's type picker usable.
    private const int MaxTypesPerTeam = 30;

    private const string ManageForbiddenMessage = "Only the team Owner, Captain or Officers can manage event types.";
    private const string OtherLockedMessage = "\"Other\" can't be changed or removed. It's where events go when their type is removed.";

    private readonly ITeamEventTypeRepository _typeRepository;
    private readonly ITeamRepository _teamRepository;

    public TeamEventTypeService(ITeamEventTypeRepository typeRepository, ITeamRepository teamRepository)
    {
        _typeRepository = typeRepository;
        _teamRepository = teamRepository;
    }

    public async Task<Result<TeamEventTypesDto>> GetAsync(string userId, int teamId, CancellationToken cancellationToken = default)
    {
        if (await _teamRepository.GetTeamMemberAsync(teamId, userId, cancellationToken) == null)
            return Result<TeamEventTypesDto>.Forbidden("You don't have access to the calendar of this team.");

        var types = await _typeRepository.GetByTeamAsync(teamId, cancellationToken);
        var presetsInUse = types.Where(t => t.Preset != null).Select(t => t.Preset!.Value).ToHashSet();

        return Result<TeamEventTypesDto>.SuccessResult(new TeamEventTypesDto
        {
            Types = types.Select(ToDto).ToList(),
            AvailablePresets = EventTypeCatalog.Presets
                .Where(p => !presetsInUse.Contains(p.Preset))
                .Select(p => new EventTypePresetDto { Preset = p.Preset.ToString(), Name = p.Name, Color = p.Color })
                .ToList()
        });
    }

    public async Task<Result<TeamEventTypeDto>> CreateCustomAsync(string userId, int teamId, SaveTeamEventTypeDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventTypeDto>.Forbidden(ManageForbiddenMessage);

        var type = new TeamEventType { TeamId = teamId, Name = dto.Name.Trim(), Color = NormalizeColor(dto.Color) };
        return await AddAsync(teamId, type);
    }

    public async Task<Result<TeamEventTypeDto>> AddPresetAsync(string userId, int teamId, string preset)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventTypeDto>.Forbidden(ManageForbiddenMessage);

        if (!Enum.TryParse<EventTypePreset>(preset, ignoreCase: false, out var parsed) || !Enum.IsDefined(parsed))
            return Result<TeamEventTypeDto>.NotFound("There's no premade event type with that name.");

        var types = await _typeRepository.GetByTeamAsync(teamId);
        if (types.Any(t => t.Preset == parsed))
            return Result<TeamEventTypeDto>.Failure($"{EventTypeCatalog.Get(parsed).Name} is already on the list.");

        var type = EventTypeCatalog.Create(parsed);
        type.TeamId = teamId;
        return await AddAsync(teamId, type, types);
    }

    public async Task<Result<TeamEventTypeDto>> UpdateAsync(string userId, int teamId, int typeId, SaveTeamEventTypeDto dto)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<TeamEventTypeDto>.Forbidden(ManageForbiddenMessage);

        var type = await _typeRepository.GetByIdAsync(teamId, typeId);
        if (type == null)
            return Result<TeamEventTypeDto>.NotFound("Event type was not found.");
        if (type.IsOther)
            return Result<TeamEventTypeDto>.Failure(OtherLockedMessage);

        var name = dto.Name.Trim();
        var types = await _typeRepository.GetByTeamAsync(teamId);
        if (types.Any(t => t.Id != typeId && NamesMatch(t.Name, name)))
            return Result<TeamEventTypeDto>.Failure(DuplicateNameMessage(name));

        var color = NormalizeColor(dto.Color);
        var outcome = await _typeRepository.UpdateAsync(teamId, typeId, name, color);
        if (outcome == WriteOutcome.Rejected)
            return Result<TeamEventTypeDto>.NotFound("Event type was not found. It may have just been removed.");
        if (outcome == WriteOutcome.Conflict)
            return Result<TeamEventTypeDto>.Conflict(DuplicateNameMessage(name));

        type.Name = name;
        type.Color = color;
        return Result<TeamEventTypeDto>.SuccessResult(ToDto(type));
    }

    public async Task<Result<string>> DeleteAsync(string userId, int teamId, int typeId)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<string>.Forbidden(ManageForbiddenMessage);

        var type = await _typeRepository.GetByIdAsync(teamId, typeId);
        if (type == null)
            return Result<string>.NotFound("Event type was not found.");
        if (type.IsOther)
            return Result<string>.Failure(OtherLockedMessage);

        return await _typeRepository.DeleteAsync(teamId, typeId) switch
        {
            WriteOutcome.Done => Result<string>.SuccessResult($"{type.Name} removed. Its events are now under Other."),
            WriteOutcome.Rejected => Result<string>.NotFound("Event type was not found. It may have just been removed."),
            _ => Result<string>.Conflict("Someone else changed the calendar at the same moment. Try again.")
        };
    }

    public async Task<Result<string>> DeleteAllAsync(string userId, int teamId)
    {
        if (!await CanManageAsync(teamId, userId))
            return Result<string>.Forbidden(ManageForbiddenMessage);

        var removed = await _typeRepository.DeleteAllExceptOtherAsync(teamId);
        if (removed == null)
            return Result<string>.Conflict("Someone else changed the calendar at the same moment. Try again.");

        return Result<string>.SuccessResult(removed == 0
            ? "Only Other is left, and it stays."
            : "All event types removed except Other. Every event is now under Other.");
    }

    private async Task<Result<TeamEventTypeDto>> AddAsync(int teamId, TeamEventType type, List<TeamEventType>? existing = null)
    {
        existing ??= await _typeRepository.GetByTeamAsync(teamId);
        if (existing.Count >= MaxTypesPerTeam)
            return Result<TeamEventTypeDto>.Failure($"A team can have at most {MaxTypesPerTeam} event types.");
        if (existing.Any(t => NamesMatch(t.Name, type.Name)))
            return Result<TeamEventTypeDto>.Failure(DuplicateNameMessage(type.Name));

        // The unique indexes catch a duplicate added by a simultaneous request.
        if (await _typeRepository.AddAsync(type) != WriteOutcome.Done)
            return Result<TeamEventTypeDto>.Conflict(DuplicateNameMessage(type.Name));

        return Result<TeamEventTypeDto>.SuccessResult(ToDto(type));
    }

    private async Task<bool> CanManageAsync(int teamId, string userId)
    {
        var member = await _teamRepository.GetTeamMemberAsync(teamId, userId);
        return member != null && member.CanManageTeam;
    }

    private static bool NamesMatch(string a, string b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase);

    private static string DuplicateNameMessage(string name) => $"There's already an event type called \"{name}\".";

    private static string NormalizeColor(string color) => color.ToUpperInvariant();

    private static TeamEventTypeDto ToDto(TeamEventType t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Color = t.Color,
        Preset = t.Preset?.ToString(),
        IsLocked = t.IsOther
    };
}
