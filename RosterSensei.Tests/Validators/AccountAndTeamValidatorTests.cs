using FluentValidation;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Validators;

namespace RosterSensei.Tests.Validators;

// The request rules for sign-up, login and the roster endpoints. The API runs these before any controller.
public class AccountAndTeamValidatorTests
{
    [Theory]
    [InlineData("Sensei Five")]
    [InlineData("abc")]
    [InlineData("Team 2026")]
    public void A_team_name_with_letters_numbers_and_spaces_is_valid(string name) =>
        AssertValid(new CreateTeamDtoValidator(), new CreateTeamDto { Name = name });

    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("Team-One")]
    [InlineData("Ninjas_in_Pyjamas")]
    [InlineData("<script>")]
    public void A_bad_team_name_is_rejected(string name) =>
        AssertInvalid(new CreateTeamDtoValidator(), new CreateTeamDto { Name = name }, nameof(CreateTeamDto.Name));

    [Fact]
    public void A_team_name_can_be_50_characters_but_not_51()
    {
        AssertValid(new CreateTeamDtoValidator(), new CreateTeamDto { Name = new string('a', 50) });
        AssertInvalid(new CreateTeamDtoValidator(), new CreateTeamDto { Name = new string('a', 51) }, nameof(CreateTeamDto.Name));
    }

    [Fact]
    public void A_complete_sign_up_is_valid() =>
        AssertValid(new RegisterDtoValidator(), new RegisterDto { Email = "alice@example.com", Username = "alice", Password = "x" });

    [Theory]
    [InlineData("", "alice", "pw", nameof(RegisterDto.Email))]
    [InlineData("not-an-email", "alice", "pw", nameof(RegisterDto.Email))]
    [InlineData("alice@example.com", "", "pw", nameof(RegisterDto.Username))]
    [InlineData("alice@example.com", "al", "pw", nameof(RegisterDto.Username))]
    [InlineData("alice@example.com", "alice", "", nameof(RegisterDto.Password))]
    public void A_sign_up_with_a_missing_or_bad_field_is_rejected(string email, string username, string password, string field) =>
        AssertInvalid(new RegisterDtoValidator(), new RegisterDto { Email = email, Username = username, Password = password }, field);

    [Fact]
    public void A_username_can_be_32_characters_but_not_33()
    {
        AssertValid(new RegisterDtoValidator(), new RegisterDto { Email = "a@example.com", Username = new string('a', 32), Password = "x" });
        AssertInvalid(new RegisterDtoValidator(), new RegisterDto { Email = "a@example.com", Username = new string('a', 33), Password = "x" }, nameof(RegisterDto.Username));
    }

    [Fact]
    public void An_email_longer_than_256_characters_is_rejected() =>
        AssertInvalid(new RegisterDtoValidator(),
            new RegisterDto { Email = new string('a', 245) + "@example.com", Username = "alice", Password = "x" },
            nameof(RegisterDto.Email));

    [Theory]
    [InlineData("", "pw", nameof(LoginDto.Email))]
    [InlineData("alice", "pw", nameof(LoginDto.Email))]
    [InlineData("alice@example.com", "", nameof(LoginDto.Password))]
    public void A_login_with_a_missing_or_bad_field_is_rejected(string email, string password, string field) =>
        AssertInvalid(new LoginDtoValidator(), new LoginDto { Email = email, Password = password }, field);

    [Fact]
    public void A_complete_login_is_valid() =>
        AssertValid(new LoginDtoValidator(), new LoginDto { Email = "alice@example.com", Password = "pw" });

    [Theory]
    [InlineData("")]
    [InlineData("bob")]
    public void Inviting_needs_a_valid_email(string email) =>
        AssertInvalid(new AddTeamMemberDtoValidator(), new AddTeamMemberDto { UserEmail = email }, nameof(AddTeamMemberDto.UserEmail));

    [Fact]
    public void Inviting_by_email_is_valid() =>
        AssertValid(new AddTeamMemberDtoValidator(), new AddTeamMemberDto { UserEmail = "bob@example.com" });

    [Theory]
    [InlineData("Captain")]
    [InlineData("officer")]
    [InlineData("PLAYER")]
    public void Every_team_role_is_accepted_in_any_case(string role) =>
        AssertValid(new ChangeRoleDtoValidator(), new ChangeRoleDto { NewRole = role });

    // "Owner" is not a TeamRole, so it fails here before the service's own check. Numbers are refused so a
    // client can't send an enum value that isn't defined.
    [Theory]
    [InlineData("")]
    [InlineData("Owner")]
    [InlineData("Coach")]
    [InlineData("3")]
    [InlineData("99")]
    public void An_unknown_role_is_rejected(string role) =>
        AssertInvalid(new ChangeRoleDtoValidator(), new ChangeRoleDto { NewRole = role }, nameof(ChangeRoleDto.NewRole));

    [Fact]
    public void Transferring_ownership_needs_a_new_owner()
    {
        AssertInvalid(new TransferOwnershipDtoValidator(), new TransferOwnershipDto { NewOwnerId = "" }, nameof(TransferOwnershipDto.NewOwnerId));
        AssertValid(new TransferOwnershipDtoValidator(), new TransferOwnershipDto { NewOwnerId = "bob" });
    }

    private static void AssertValid<T>(IValidator<T> validator, T dto)
    {
        var result = validator.Validate(dto);
        Assert.True(result.IsValid, string.Join(" ", result.Errors.Select(e => e.ErrorMessage)));
    }

    private static void AssertInvalid<T>(IValidator<T> validator, T dto, string property)
    {
        var result = validator.Validate(dto);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == property);
    }
}
