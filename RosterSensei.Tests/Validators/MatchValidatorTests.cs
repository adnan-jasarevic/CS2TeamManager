using RosterSensei.Application.DTOs;
using RosterSensei.Application.Validators;
using RosterSensei.Domain.Entities;

namespace RosterSensei.Tests.Validators;

// The rules for recording a match: dates, scores, best-of and the per-map half scores (MR12, with overtime
// only after 12-12).
public class MatchValidatorTests
{
    private static readonly DateTime Scheduled = new(2026, 11, 1, 18, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void A_finished_best_of_three_is_valid() =>
        AssertValid(Finished(2, 1, bestOf: 3, Map("Mirage", 13, 9), Map("Inferno", 10, 13), Map("Nuke", 13, 7)));

    [Fact]
    public void A_scheduled_match_without_scores_is_valid() =>
        AssertValid(new CreateMatchDto { OpponentName = "Rivals", ScheduledDate = Scheduled, Status = MatchStatus.Scheduled, Maps = { new MatchMapDto { MapName = "Ancient" } } });

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void The_opponent_is_required(string? opponent)
    {
        var match = Finished(1, 0, bestOf: 1);
        match.OpponentName = opponent!;
        AssertInvalid(match, nameof(CreateMatchDto.OpponentName));
    }

    [Fact]
    public void Long_text_fields_are_capped()
    {
        var match = Finished(1, 0, bestOf: 1);
        match.OpponentName = new string('a', 101);
        match.Tournament = new string('a', 101);
        match.Notes = new string('a', 1001);

        var errors = Errors(match);

        Assert.Contains(nameof(CreateMatchDto.OpponentName), errors);
        Assert.Contains(nameof(CreateMatchDto.Tournament), errors);
        Assert.Contains(nameof(CreateMatchDto.Notes), errors);
    }

    [Fact]
    public void The_scheduled_date_is_required()
    {
        var match = Finished(1, 0, bestOf: 1);
        match.ScheduledDate = default;
        match.PlayedDate = null;
        AssertInvalid(match, nameof(CreateMatchDto.ScheduledDate));
    }

    [Fact]
    public void A_match_cannot_be_played_before_it_was_scheduled()
    {
        var match = Finished(1, 0, bestOf: 1);
        match.PlayedDate = Scheduled.AddMinutes(-1);
        AssertInvalid(match, nameof(CreateMatchDto.PlayedDate));
    }

    [Fact]
    public void Undefined_status_and_type_values_are_rejected()
    {
        var match = Finished(1, 0, bestOf: 1);
        match.Status = (MatchStatus)42;
        match.Type = (MatchKind)42;

        var errors = Errors(match);

        Assert.Contains(nameof(CreateMatchDto.Status), errors);
        Assert.Contains(nameof(CreateMatchDto.Type), errors);
    }

    [Fact]
    public void Negative_series_scores_are_rejected()
    {
        var errors = Errors(Finished(-1, -2, bestOf: null));

        Assert.Contains(nameof(CreateMatchDto.OurScore), errors);
        Assert.Contains(nameof(CreateMatchDto.OpponentScore), errors);
    }

    [Fact]
    public void A_scheduled_match_cannot_have_a_series_score()
    {
        var match = Finished(1, 0, bestOf: null);
        match.Status = MatchStatus.Scheduled;
        match.PlayedDate = null;
        AssertInvalid(match, "Score");
    }

    [Fact]
    public void A_scheduled_match_cannot_have_map_scores()
    {
        var match = Finished(0, 0, bestOf: 1, Map("Mirage", 13, 5));
        match.Status = MatchStatus.Scheduled;
        AssertInvalid(match, nameof(CreateMatchDto.Maps));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(5)]
    public void Best_of_one_two_three_and_five_are_allowed(int bestOf) =>
        AssertValid(Finished(0, 0, bestOf));

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(7)]
    public void Other_best_of_counts_are_rejected(int bestOf) =>
        AssertInvalid(Finished(0, 0, bestOf), nameof(CreateMatchDto.BestOf));

    [Fact]
    public void A_match_cannot_have_more_maps_than_its_best_of() =>
        AssertInvalid(Finished(1, 0, bestOf: 1, Map("Mirage", 13, 5), Map("Nuke", 13, 5)), nameof(CreateMatchDto.Maps));

    [Fact]
    public void Map_errors_point_at_the_broken_map()
    {
        var errors = Errors(Finished(1, 0, bestOf: 3, Map("Mirage", 13, 5), Map("", 13, 5)));

        Assert.Contains("Maps[1].MapName", errors);
        Assert.DoesNotContain(errors, e => e.StartsWith("Maps[0]"));
    }

    [Fact]
    public void A_map_name_is_capped_at_50_characters() =>
        AssertInvalidMap(new MatchMapDto { MapName = new string('a', 51) }, nameof(MatchMapDto.MapName));

    [Fact]
    public void A_map_needs_both_scores_or_neither()
    {
        AssertInvalidMap(new MatchMapDto { MapName = "Mirage", OurScore = 13 }, "Score");
        AssertInvalidMap(new MatchMapDto { MapName = "Mirage", OpponentScore = 13 }, "Score");
        AssertValidMap(new MatchMapDto { MapName = "Mirage" });
    }

    [Fact]
    public void Map_scores_cannot_be_negative() =>
        AssertInvalidMap(new MatchMapDto { MapName = "Mirage", OurScore = -1, OpponentScore = 13 }, "Score");

    [Theory]
    [InlineData(7, 5, 6, 6, 13, 11)] // regulation win, second half cut short at 13
    [InlineData(2, 10, 4, 3, 6, 13)] // regulation loss
    [InlineData(6, 6, 6, 6, 16, 14)] // overtime after 12-12
    [InlineData(6, 6, 6, 6, 12, 12)] // draw at the end of regulation
    public void Half_scores_that_add_up_are_valid(int ourFirst, int oppFirst, int ourSecond, int oppSecond, int our, int opp) =>
        AssertValidMap(Halves(ourFirst, oppFirst, ourSecond, oppSecond, our, opp));

    [Theory]
    [InlineData(8, 4, 6, 6, 13, 11)] // halves give 14-10
    [InlineData(7, 5, 6, 5, 16, 14)] // overtime without a 12-12 regulation
    [InlineData(6, 6, 6, 6, 11, 14)] // overtime can't take rounds away
    public void Half_scores_that_dont_add_up_are_rejected(int ourFirst, int oppFirst, int ourSecond, int oppSecond, int our, int opp) =>
        AssertInvalidMap(Halves(ourFirst, oppFirst, ourSecond, oppSecond, our, opp), "Halves");

    [Fact]
    public void A_half_has_at_most_12_rounds() =>
        AssertInvalidMap(Halves(7, 6, 6, 4, 13, 10), "Halves");

    [Fact]
    public void Half_scores_are_all_or_nothing() =>
        AssertInvalidMap(new MatchMapDto { MapName = "Mirage", OurScore = 13, OpponentScore = 5, OurFirstHalf = 8, OpponentFirstHalf = 4 }, "Halves");

    [Fact]
    public void Half_scores_need_a_final_score() =>
        AssertInvalidMap(new MatchMapDto { MapName = "Mirage", OurFirstHalf = 8, OpponentFirstHalf = 4, OurSecondHalf = 5, OpponentSecondHalf = 1 }, "Halves");

    private static CreateMatchDto Finished(int our, int opponent, int? bestOf, params MatchMapDto[] maps) => new()
    {
        OpponentName = "Rivals",
        ScheduledDate = Scheduled,
        PlayedDate = Scheduled.AddHours(2),
        Status = MatchStatus.Finished,
        Type = MatchKind.Official,
        OurScore = our,
        OpponentScore = opponent,
        BestOf = bestOf,
        Maps = maps.ToList()
    };

    private static MatchMapDto Map(string name, int our, int opponent) =>
        new() { MapName = name, OurScore = our, OpponentScore = opponent };

    private static MatchMapDto Halves(int ourFirst, int oppFirst, int ourSecond, int oppSecond, int our, int opp) => new()
    {
        MapName = "Mirage",
        OurFirstHalf = ourFirst,
        OpponentFirstHalf = oppFirst,
        OurSecondHalf = ourSecond,
        OpponentSecondHalf = oppSecond,
        OurScore = our,
        OpponentScore = opp
    };

    private static List<string> Errors(CreateMatchDto dto) =>
        new CreateMatchDtoValidator().Validate(dto).Errors.Select(e => e.PropertyName).ToList();

    private static void AssertValid(CreateMatchDto dto)
    {
        var result = new CreateMatchDtoValidator().Validate(dto);
        Assert.True(result.IsValid, string.Join(" ", result.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}")));
    }

    private static void AssertInvalid(CreateMatchDto dto, string property) => Assert.Contains(property, Errors(dto));

    private static void AssertValidMap(MatchMapDto map)
    {
        var result = new MatchMapDtoValidator().Validate(map);
        Assert.True(result.IsValid, string.Join(" ", result.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}")));
    }

    private static void AssertInvalidMap(MatchMapDto map, string property) =>
        Assert.Contains(new MatchMapDtoValidator().Validate(map).Errors, e => e.PropertyName == property);
}
