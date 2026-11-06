using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class SetMatchLineupDtoValidator : AbstractValidator<SetMatchLineupDto>
{
    // Five starters plus substitutes and stand-ins. More than five can have played, since a
    // player can be swapped between maps of a series.
    public const int MaxPlayers = 10;
    public const int MaxRoleLength = 30;

    public SetMatchLineupDtoValidator()
    {
        RuleFor(d => d.Players)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("The lineup is required.")
            .Must(p => p.Count <= MaxPlayers).WithMessage($"A lineup can have at most {MaxPlayers} players.")
            .Must(p => p.Select(x => x.UserId).Distinct().Count() == p.Count).WithMessage("A player can only be in the lineup once.");

        RuleForEach(d => d.Players).ChildRules(player =>
        {
            player.RuleFor(p => p.UserId)
                .NotEmpty().WithMessage("Each player needs a user ID.")
                .MaximumLength(450).WithMessage("The user ID is too long.");

            player.RuleFor(p => p.Role)
                .MaximumLength(MaxRoleLength).WithMessage($"A role cannot exceed {MaxRoleLength} characters.");
        });
    }
}
