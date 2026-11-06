using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Validators;
using RosterSensei.Domain.Enums;
using RosterSensei.Tests.Infrastructure;

namespace RosterSensei.Tests;

public class SteamIdTests
{
    private const string Gabe = "76561197960287930";

    [Theory]
    [InlineData(Gabe)]
    [InlineData(" 76561197960287930 ")]
    [InlineData("https://steamcommunity.com/profiles/76561197960287930")]
    [InlineData("https://steamcommunity.com/profiles/76561197960287930/")]
    [InlineData("http://www.steamcommunity.com/profiles/76561197960287930/?l=english")]
    [InlineData("steamcommunity.com/profiles/76561197960287930")]
    [InlineData("STEAM_0:0:11101")]
    [InlineData("STEAM_1:0:11101")]
    [InlineData("[U:1:22202]")]
    [InlineData("U:1:22202")]
    public void Reads_every_supported_format_as_the_same_SteamID64(string input)
    {
        Assert.True(SteamId.TryParse(input, out var steamId64));
        Assert.Equal(Gabe, steamId64);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("7656119796028793")]          // 16 digits
    [InlineData("765611979602879300")]        // 18 digits
    [InlineData("76561197960265728")]         // account number 0
    [InlineData("12345678901234567")]         // below the individual range
    [InlineData("76561202255233024")]         // above the individual range
    [InlineData("https://steamcommunity.com/groups/valve")]
    [InlineData("https://evil.example/steamcommunity.com/profiles/76561197960287930")]
    [InlineData("https://steamcommunity.com.evil.example/profiles/76561197960287930")]
    [InlineData("STEAM_0:2:11101")]
    [InlineData("[U:1:0]")]
    [InlineData("[U:1:4294967296]")]
    [InlineData("gaben")]
    public void Rejects_anything_that_is_not_an_individual_Steam_account(string? input)
    {
        Assert.False(SteamId.TryParse(input, out _));
    }

    [Fact]
    public void Highest_account_number_is_accepted()
    {
        Assert.True(SteamId.TryParse("[U:1:4294967295]", out var steamId64));
        Assert.Equal("76561202255233023", steamId64);
    }

    [Fact]
    public void Validator_explains_that_custom_profile_URLs_are_not_supported()
    {
        var result = new LinkSteamAccountDtoValidator().Validate(new LinkSteamAccountDto { Steam = "https://steamcommunity.com/id/gaben/" });

        Assert.False(result.IsValid);
        Assert.Equal(SteamId.CustomUrlHint, Assert.Single(result.Errors).ErrorMessage);
    }

    [Fact]
    public void Validator_gives_the_format_hint_for_unreadable_input()
    {
        var result = new LinkSteamAccountDtoValidator().Validate(new LinkSteamAccountDto { Steam = "not a steam id" });

        Assert.False(result.IsValid);
        Assert.Equal(SteamId.FormatHint, Assert.Single(result.Errors).ErrorMessage);
    }

    [Fact]
    public void Validator_accepts_a_profile_URL()
    {
        var result = new LinkSteamAccountDtoValidator().Validate(new LinkSteamAccountDto { Steam = "https://steamcommunity.com/profiles/76561197960287930" });

        Assert.True(result.IsValid);
    }
}

public class SteamAccountTests : IDisposable
{
    private const string SteamId64 = "76561197960287930";
    private const string OtherSteamId64 = "76561198000000000";

    private readonly TestDatabase _db = new();
    private readonly string _alice;
    private readonly string _bob;

    public SteamAccountTests()
    {
        _alice = _db.AddUser("alice");
        _bob = _db.AddUser("bob");
    }

    public void Dispose() => _db.Dispose();

    private static LinkSteamAccountDto Link(string steam) => new() { Steam = steam };

    [Fact]
    public async Task A_new_user_has_no_Steam_account()
    {
        var result = await _db.AccountService().GetSteamAccountAsync(_alice);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null(result.Data!.SteamId);
        Assert.Null(result.Data.ProfileUrl);
    }

    [Fact]
    public async Task Linking_stores_the_SteamID64_whatever_format_was_entered()
    {
        var result = await _db.AccountService().LinkSteamAccountAsync(_alice, Link("[U:1:22202]"));

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(SteamId64, result.Data!.SteamId);
        Assert.Equal($"https://steamcommunity.com/profiles/{SteamId64}", result.Data.ProfileUrl);

        var stored = await _db.AccountService().GetSteamAccountAsync(_alice);
        Assert.Equal(SteamId64, stored.Data!.SteamId);
    }

    [Fact]
    public async Task Linking_the_same_account_again_succeeds()
    {
        await _db.AccountService().LinkSteamAccountAsync(_alice, Link(SteamId64));

        var result = await _db.AccountService().LinkSteamAccountAsync(_alice, Link($"https://steamcommunity.com/profiles/{SteamId64}"));

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(SteamId64, result.Data!.SteamId);
    }

    [Fact]
    public async Task Linking_another_account_replaces_the_old_one()
    {
        await _db.AccountService().LinkSteamAccountAsync(_alice, Link(SteamId64));

        var result = await _db.AccountService().LinkSteamAccountAsync(_alice, Link(OtherSteamId64));

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal(OtherSteamId64, (await _db.AccountService().GetSteamAccountAsync(_alice)).Data!.SteamId);

        // The old account is free again.
        Assert.True((await _db.AccountService().LinkSteamAccountAsync(_bob, Link(SteamId64))).Success);
    }

    [Fact]
    public async Task A_Steam_account_linked_to_someone_else_is_refused()
    {
        await _db.AccountService().LinkSteamAccountAsync(_alice, Link(SteamId64));

        var result = await _db.AccountService().LinkSteamAccountAsync(_bob, Link(SteamId64));

        Assert.False(result.Success);
        Assert.Equal(ErrorType.Conflict, result.ErrorType);
        Assert.Null((await _db.AccountService().GetSteamAccountAsync(_bob)).Data!.SteamId);
        Assert.Equal(SteamId64, (await _db.AccountService().GetSteamAccountAsync(_alice)).Data!.SteamId);
    }

    [Fact]
    public async Task The_unique_index_catches_a_link_that_slipped_past_the_check()
    {
        await _db.AccountService().LinkSteamAccountAsync(_alice, Link(SteamId64));

        // Bob's request checked before Alice's link was saved, then writes: the database must refuse it.
        var outcome = await new RosterSensei.Infrastructure.Repositories.UserRepository(_db.CreateContext())
            .SetSteamIdAsync(_bob, SteamId64);

        Assert.Equal(RosterSensei.Application.Interfaces.WriteOutcome.Conflict, outcome);
        Assert.Null((await _db.AccountService().GetSteamAccountAsync(_bob)).Data!.SteamId);
    }

    [Fact]
    public async Task Two_users_linking_the_same_account_at_once_end_with_one_owner()
    {
        var results = await Task.WhenAll(
            _db.AccountService().LinkSteamAccountAsync(_alice, Link(SteamId64)),
            _db.AccountService().LinkSteamAccountAsync(_bob, Link(SteamId64)));

        Assert.Single(results, r => r.Success);
        Assert.Single(results, r => r.ErrorType == ErrorType.Conflict);

        var linked = new[]
        {
            (await _db.AccountService().GetSteamAccountAsync(_alice)).Data!.SteamId,
            (await _db.AccountService().GetSteamAccountAsync(_bob)).Data!.SteamId
        };
        Assert.Single(linked, id => id == SteamId64);
    }

    [Fact]
    public async Task Unlinking_clears_the_account_and_frees_it()
    {
        await _db.AccountService().LinkSteamAccountAsync(_alice, Link(SteamId64));

        var result = await _db.AccountService().UnlinkSteamAccountAsync(_alice);

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Null((await _db.AccountService().GetSteamAccountAsync(_alice)).Data!.SteamId);
        Assert.True((await _db.AccountService().LinkSteamAccountAsync(_bob, Link(SteamId64))).Success);
    }

    [Fact]
    public async Task Unlinking_without_a_linked_account_still_succeeds()
    {
        var result = await _db.AccountService().UnlinkSteamAccountAsync(_alice);

        Assert.True(result.Success, result.ErrorMessage);
    }

    [Fact]
    public async Task Invalid_input_is_refused_by_the_service_too()
    {
        var custom = await _db.AccountService().LinkSteamAccountAsync(_alice, Link("https://steamcommunity.com/id/gaben"));
        var garbage = await _db.AccountService().LinkSteamAccountAsync(_alice, Link("hello"));

        Assert.Equal(ErrorType.Validation, custom.ErrorType);
        Assert.Equal(SteamId.CustomUrlHint, custom.ErrorMessage);
        Assert.Equal(ErrorType.Validation, garbage.ErrorType);
        Assert.Null((await _db.AccountService().GetSteamAccountAsync(_alice)).Data!.SteamId);
    }

    [Fact]
    public async Task Unknown_users_get_not_found()
    {
        Assert.Equal(ErrorType.NotFound, (await _db.AccountService().GetSteamAccountAsync("ghost")).ErrorType);
        Assert.Equal(ErrorType.NotFound, (await _db.AccountService().LinkSteamAccountAsync("ghost", Link(SteamId64))).ErrorType);
        Assert.Equal(ErrorType.NotFound, (await _db.AccountService().UnlinkSteamAccountAsync("ghost")).ErrorType);
    }

    [Fact]
    public async Task The_roster_shows_each_members_linked_Steam_account()
    {
        var teamId = _db.AddTeam(_alice, (_bob, TeamRole.Player));
        await _db.AccountService().LinkSteamAccountAsync(_bob, Link(SteamId64));

        var members = await _db.TeamService().GetTeamMembersAsync(teamId, _alice);

        Assert.True(members.Success, members.ErrorMessage);
        var bob = Assert.Single(members.Data!, m => m.Id == _bob);
        Assert.Equal(SteamId64, bob.SteamId);
        Assert.Equal($"https://steamcommunity.com/profiles/{SteamId64}", bob.SteamProfileUrl);
        var alice = Assert.Single(members.Data!, m => m.Id == _alice);
        Assert.Null(alice.SteamId);
        Assert.Null(alice.SteamProfileUrl);
    }
}
