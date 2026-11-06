namespace RosterSensei.Domain.Entities;

// The premade event types. A new team starts with the ones marked OnByDefault; the rest can be added later.
public static class EventTypeCatalog
{
    public sealed record PresetInfo(EventTypePreset Preset, string Name, string Color, bool OnByDefault);

    public static readonly IReadOnlyList<PresetInfo> Presets =
    [
        new(EventTypePreset.Pracc, "Pracc", "#3B82F6", true),
        new(EventTypePreset.OfficialMatch, "Official Match", "#E0243F", true),
        new(EventTypePreset.Scrim, "Scrim", "#10B981", false),
        new(EventTypePreset.VodReview, "VOD Review", "#D9A441", true),
        new(EventTypePreset.RecordedMatch, "Recorded Match", "#06B6D4", false),
        new(EventTypePreset.Theory, "Theory", "#8B5CF6", true),
        new(EventTypePreset.Break, "Break", "#94A3B8", false),
        new(EventTypePreset.Warmup, "Warmup", "#F97316", false),
        new(EventTypePreset.Meet, "Meet", "#EC4899", false),
        new(EventTypePreset.Other, "Other", "#6E6468", true),
    ];

    public static PresetInfo Get(EventTypePreset preset) => Presets.Single(p => p.Preset == preset);

    public static TeamEventType Create(EventTypePreset preset)
    {
        var info = Get(preset);
        return new TeamEventType { Name = info.Name, Color = info.Color, Preset = preset };
    }

    // The types a new team starts with.
    public static List<TeamEventType> CreateDefaults() =>
        Presets.Where(p => p.OnByDefault).Select(p => Create(p.Preset)).ToList();
}
