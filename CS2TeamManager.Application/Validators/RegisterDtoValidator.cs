using CS2TeamManager.Application.DTOs;
using FluentValidation;

namespace CS2TeamManager.Application.Validators;

// Password strength and username/email uniqueness are checked by ASP.NET Core Identity on register.
public class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    public RegisterDtoValidator()
    {
        RuleFor(d => d.Email)
            .NotEmpty().WithMessage("The email is required.")
            .EmailAddress().WithMessage("Enter a valid email address.")
            .MaximumLength(256).WithMessage("The email cannot exceed 256 characters.");

        RuleFor(d => d.Username)
            .NotEmpty().WithMessage("The username is required.")
            .MinimumLength(3).WithMessage("The username must be at least 3 characters long.")
            .MaximumLength(32).WithMessage("The username cannot exceed 32 characters.");

        RuleFor(d => d.Password)
            .NotEmpty().WithMessage("The password is required.");
    }
}
