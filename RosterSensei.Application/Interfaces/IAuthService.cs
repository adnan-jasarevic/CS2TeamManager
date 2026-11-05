using RosterSensei.Application.DTOs;

namespace RosterSensei.Application.Interfaces;

public record AuthError(string Code, string Description);

public interface IAuthService
{
    Task<IReadOnlyList<AuthError>> RegisterAsync(RegisterDto dto);

    // Returns null when the email or password is wrong.
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
}
