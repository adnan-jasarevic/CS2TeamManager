using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class LinkSteamAccountDtoValidator : AbstractValidator<LinkSteamAccountDto>
{
    public LinkSteamAccountDtoValidator()
    {
        RuleFor(d => d.Steam)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("The Steam account is required.")
            .MaximumLength(200).WithMessage("The Steam account cannot exceed 200 characters.")
            .Must(steam => !SteamId.IsCustomProfileUrl(steam)).WithMessage(SteamId.CustomUrlHint)
            .Must(steam => SteamId.TryParse(steam, out _)).WithMessage(SteamId.FormatHint);
    }
}
