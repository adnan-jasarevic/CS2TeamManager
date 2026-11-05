using CS2TeamManager.Application.DTOs;
using FluentValidation;

namespace CS2TeamManager.Application.Validators;

public class TransferOwnershipDtoValidator : AbstractValidator<TransferOwnershipDto>
{
    public TransferOwnershipDtoValidator()
    {
        RuleFor(d => d.NewOwnerId)
            .NotEmpty().WithMessage("Choose the member who will become the new Owner.");
    }
}
