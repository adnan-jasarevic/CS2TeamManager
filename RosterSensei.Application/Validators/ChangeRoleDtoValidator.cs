using RosterSensei.Application.DTOs;
using RosterSensei.Domain.Enums;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class ChangeRoleDtoValidator : AbstractValidator<ChangeRoleDto>
{
    public ChangeRoleDtoValidator()
    {
        RuleFor(d => d.NewRole)
            .NotEmpty().WithMessage("The new role is required.")
            .IsEnumName(typeof(TeamRole), caseSensitive: false).WithMessage("Invalid role provided.");
    }
}
