using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Domain.Enums;
using FluentValidation;

namespace CS2TeamManager.Application.Validators;

public class ChangeRoleDtoValidator : AbstractValidator<ChangeRoleDto>
{
    public ChangeRoleDtoValidator()
    {
        RuleFor(d => d.NewRole)
            .NotEmpty().WithMessage("The new role is required.")
            .IsEnumName(typeof(TeamRole), caseSensitive: false).WithMessage("Invalid role provided.");
    }
}
