using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class SaveTeamOffDayDtoValidator : AbstractValidator<SaveTeamOffDayDto>
{
    public SaveTeamOffDayDtoValidator()
    {
        RuleFor(d => d.StartTime)
            .NotEqual(default(DateTime)).WithMessage("The start of the day is required.");

        // A calendar day lasts 23 to 25 hours, depending on daylight saving changes.
        RuleFor(d => d)
            .Must(d => d.EndTime - d.StartTime >= TimeSpan.FromHours(23) && d.EndTime - d.StartTime <= TimeSpan.FromHours(25))
            .OverridePropertyName("EndTime")
            .WithMessage("An off day must cover one whole day.");
    }
}
