using CS2TeamManager.Application.Common;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CS2TeamManager.Api.Controllers;

// Shared helpers so every controller reads the user and turns a Result into a response the same way.
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    // Only used behind [Authorize], where the JWT always carries the user ID.
    protected string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("The authenticated user has no ID claim.");

    // Success returns the data; failure returns { message } with 400, 403 or 404.
    protected IActionResult ToActionResult<T>(Result<T> result)
        => result.Success ? Ok(result.Data) : Error(result);

    // For results that carry only a confirmation message: success returns { message }.
    protected IActionResult ToMessageResult(Result<string> result)
        => result.Success ? Ok(new { message = result.Data }) : Error(result);

    private IActionResult Error<T>(Result<T> result)
    {
        var statusCode = result.ErrorType switch
        {
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest
        };

        return StatusCode(statusCode, new { message = result.ErrorMessage });
    }
}
