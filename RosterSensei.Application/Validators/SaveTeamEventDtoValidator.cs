using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class SaveTeamEventDtoValidator : AbstractValidator<SaveTeamEventDto>
{
    public SaveTeamEventDtoValidator()
    {
        RuleFor(e => e.Title)
            .NotEmpty().WithMessage("The event title is required.")
            .MaximumLength(100).WithMessage("The event title cannot exceed 100 characters.");

        RuleFor(e => e.Description)
            .MaximumLength(1000).WithMessage("The description cannot exceed 1000 characters.");

        RuleFor(e => e.StartTime)
            .NotEqual(default(DateTime)).WithMessage("The start time is required.");

        RuleFor(e => e.EndTime)
            .GreaterThan(e => e.StartTime).WithMessage("The event must end after it starts.");

        RuleFor(e => e)
            .Must(e => e.EndTime - e.StartTime <= TimeSpan.FromDays(14))
            .When(e => e.EndTime > e.StartTime)
            .OverridePropertyName("EndTime")
            .WithMessage("An event cannot last longer than 14 days.");

        RuleFor(e => e.EventTypeId)
            .GreaterThan(0).WithMessage("Pick an event type.");
    }
}
