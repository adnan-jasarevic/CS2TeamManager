using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CS2TeamManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var errors = await _authService.RegisterAsync(dto);

        if (errors.Count > 0)
            return BadRequest(errors);

        return Ok(new { message = "User registered successfully" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var response = await _authService.LoginAsync(dto);

        if (response == null)
            return Unauthorized(new { message = "Invalid email or password" });

        return Ok(response);
    }
}
