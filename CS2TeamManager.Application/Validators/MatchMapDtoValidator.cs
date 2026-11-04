using CS2TeamManager.Application.DTOs;
using FluentValidation;

namespace CS2TeamManager.Application.Validators;

public class MatchMapDtoValidator : AbstractValidator<MatchMapDto>
{
    // CS2 regulation is MR12: 12 rounds per half, 24 in total. Anything past that is overtime.
    public const int RoundsPerHalf = 12;

    public MatchMapDtoValidator()
    {
        RuleFor(m => m.MapName)
            .NotEmpty().WithMessage("Map names cannot be empty.")
            .MaximumLength(50).WithMessage("Map names cannot exceed 50 characters.");

        RuleFor(m => m)
            .Must(m => m.OurScore.HasValue == m.OpponentScore.HasValue)
            .OverridePropertyName("Score")
            .WithMessage("Enter both teams' scores for a map, or neither.");

        RuleFor(m => m)
            .Must(m => AllNonNegative(m.OurScore, m.OpponentScore, m.OurFirstHalf, m.OpponentFirstHalf, m.OurSecondHalf, m.OpponentSecondHalf))
            .OverridePropertyName("Score")
            .WithMessage("Scores cannot be negative.");

        RuleFor(m => m)
            .Must(m => HalfCount(m) == 0 || HalfCount(m) == 4)
            .OverridePropertyName("Halves")
            .WithMessage("Enter both half scores for both teams, or leave them all empty.");

        RuleFor(m => m)
            .Must(m => m.OurScore.HasValue)
            .When(m => HalfCount(m) == 4)
            .OverridePropertyName("Halves")
            .WithMessage("A map with half scores needs a final score.");

        RuleFor(m => m)
            .Must(m => m.OurFirstHalf + m.OpponentFirstHalf <= RoundsPerHalf
                    && m.OurSecondHalf + m.OpponentSecondHalf <= RoundsPerHalf)
            .When(m => HalfCount(m) == 4)
            .OverridePropertyName("Halves")
            .WithMessage($"A half has at most {RoundsPerHalf} rounds.");

        RuleFor(m => m)
            .Must(HalvesMatchFinalScore)
            .When(m => HalfCount(m) == 4 && m.OurScore.HasValue && m.OpponentScore.HasValue)
            .OverridePropertyName("Halves")
            .WithMessage("The half scores don't add up to the final score. Overtime is only possible after a 12-12 regulation.");
    }

    private static int HalfCount(MatchMapDto m) =>
        new[] { m.OurFirstHalf, m.OpponentFirstHalf, m.OurSecondHalf, m.OpponentSecondHalf }.Count(h => h.HasValue);

    private static bool AllNonNegative(params int?[] values) => values.All(v => v is null or >= 0);

    private static bool HalvesMatchFinalScore(MatchMapDto m)
    {
        int ourRegulation = m.OurFirstHalf!.Value + m.OurSecondHalf!.Value;
        int opponentRegulation = m.OpponentFirstHalf!.Value + m.OpponentSecondHalf!.Value;

        if (m.OurScore == ourRegulation && m.OpponentScore == opponentRegulation)
            return true;

        // Overtime: regulation ended 12-12 and both teams can only have gained rounds since.
        bool regulationTied = ourRegulation == RoundsPerHalf && opponentRegulation == RoundsPerHalf;
        return regulationTied && m.OurScore >= ourRegulation && m.OpponentScore >= opponentRegulation;
    }
}
