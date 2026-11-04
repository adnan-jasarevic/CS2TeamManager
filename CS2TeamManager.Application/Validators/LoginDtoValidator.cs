using CS2TeamManager.Application.DTOs;
using FluentValidation;

namespace CS2TeamManager.Application.Validators;

public class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(d => d.Email)
            .NotEmpty().WithMessage("The email is required.")
            .EmailAddress().WithMessage("Enter a valid email address.");

        RuleFor(d => d.Password)
            .NotEmpty().WithMessage("The password is required.");
    }
}
