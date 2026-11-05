using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Entities;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class CreateMatchDtoValidator : AbstractValidator<CreateMatchDto>
{
    private static readonly int[] AllowedBestOf = { 1, 2, 3, 5 };

    public CreateMatchDtoValidator()
    {
        RuleFor(m => m.OpponentName)
            .NotEmpty().WithMessage("The opponent name is required.")
            .MaximumLength(100).WithMessage("The opponent name cannot exceed 100 characters.");

        RuleFor(m => m.Tournament)
            .MaximumLength(100).WithMessage("The tournament name cannot exceed 100 characters.");

        RuleFor(m => m.ScheduledDate)
            .NotEqual(default(DateTime)).WithMessage("The scheduled date is required.");

        RuleFor(m => m.PlayedDate)
            .GreaterThanOrEqualTo(m => m.ScheduledDate)
            .When(m => m.PlayedDate.HasValue)
            .WithMessage("The played date cannot be before the scheduled date.");

        RuleFor(m => m.Status)
            .IsInEnum().WithMessage("Invalid match status.");

        RuleFor(m => m.Type)
            .IsInEnum().WithMessage("Invalid match type.");

        RuleFor(m => m.OurScore)
            .GreaterThanOrEqualTo(0).WithMessage("Scores cannot be negative.");

        RuleFor(m => m.OpponentScore)
            .GreaterThanOrEqualTo(0).WithMessage("Scores cannot be negative.");

        RuleFor(m => m)
            .Must(m => m.OurScore == 0 && m.OpponentScore == 0)
            .When(m => m.Status == MatchStatus.Scheduled)
            .OverridePropertyName("Score")
            .WithMessage("A scheduled match cannot have a score yet.");

        RuleFor(m => m.BestOf)
            .Must(b => AllowedBestOf.Contains(b!.Value))
            .When(m => m.BestOf.HasValue)
            .WithMessage("Best of must be 1, 2, 3 or 5.");

        RuleForEach(m => m.Maps)
            .SetValidator(new MatchMapDtoValidator());

        RuleFor(m => m.Maps)
            .Must(maps => maps.All(map => !map.OurScore.HasValue))
            .When(m => m.Status == MatchStatus.Scheduled && m.Maps != null)
            .WithMessage("A scheduled match cannot have map scores yet.");

        RuleFor(m => m.Maps)
            .Must((m, maps) => maps.Count <= m.BestOf!.Value)
            .When(m => m.BestOf.HasValue && m.Maps != null)
            .WithMessage("A match cannot have more maps than its best-of count.");

        RuleFor(m => m.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters.");
    }
}
