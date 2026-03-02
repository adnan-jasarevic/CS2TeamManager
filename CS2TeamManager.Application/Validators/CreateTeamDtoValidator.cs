using CS2TeamManager.Application.DTOs;
using FluentValidation;

namespace CS2TeamManager.Application.Validators;

public class CreateTeamDtoValidator : AbstractValidator<CreateTeamDto>
{
    public CreateTeamDtoValidator()
    {
        RuleFor(t => t.Name)
            .NotEmpty().WithMessage("The team name is required.")
            .MinimumLength(3).WithMessage("The team name must be at least 3 characters long.")
            .MaximumLength(50).WithMessage("The team name cannot exceed 50 characters.")
            .Matches("^[a-zA-Z0-9 ]*$").WithMessage("Team name can only contain letters and numbers.");
    }
}
