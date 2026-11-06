using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class SaveTeamEventTypeDtoValidator : AbstractValidator<SaveTeamEventTypeDto>
{
    public SaveTeamEventTypeDtoValidator()
    {
        RuleFor(t => t.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("The event type needs a name.")
            .MaximumLength(50).WithMessage("The event type name cannot exceed 50 characters.");

        RuleFor(t => t.Color)
            .Matches("^#[0-9a-fA-F]{6}$").WithMessage("The colour must look like #RRGGBB.");
    }
}
