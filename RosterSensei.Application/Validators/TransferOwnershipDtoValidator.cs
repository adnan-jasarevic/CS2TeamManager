using RosterSensei.Application.DTOs;
using FluentValidation;

namespace RosterSensei.Application.Validators;

public class TransferOwnershipDtoValidator : AbstractValidator<TransferOwnershipDto>
{
    public TransferOwnershipDtoValidator()
    {
        RuleFor(d => d.NewOwnerId)
            .NotEmpty().WithMessage("Choose the member who will become the new Owner.");
    }
}
