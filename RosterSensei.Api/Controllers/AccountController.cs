using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Controllers;

// The signed-in user's own account settings.
[Authorize]
[Route("api/[controller]")]
public class AccountController : ApiControllerBase
{
    private readonly IAccountService _accountService;

    public AccountController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [HttpGet("steam")]
    public async Task<IActionResult> GetSteamAccount(CancellationToken cancellationToken)
        => ToActionResult(await _accountService.GetSteamAccountAsync(UserId, cancellationToken));

    [HttpPut("steam")]
    public async Task<IActionResult> LinkSteamAccount([FromBody] LinkSteamAccountDto dto)
        => ToActionResult(await _accountService.LinkSteamAccountAsync(UserId, dto));

    [HttpDelete("steam")]
    public async Task<IActionResult> UnlinkSteamAccount()
        => ToMessageResult(await _accountService.UnlinkSteamAccountAsync(UserId));
}
