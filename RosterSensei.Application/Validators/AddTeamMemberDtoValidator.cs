using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class AddTeamMemberDtoValidator : AbstractValidator<AddTeamMemberDto>
{
    public AddTeamMemberDtoValidator()
    {
        RuleFor(d => d.UserEmail)
            .NotEmpty().WithMessage("The email is required.")
            .EmailAddress().WithMessage("Enter a valid email address.")
            .MaximumLength(256).WithMessage("The email cannot exceed 256 characters.");
    }
}
