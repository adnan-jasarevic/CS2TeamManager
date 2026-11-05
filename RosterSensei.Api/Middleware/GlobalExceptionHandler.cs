using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace RosterSensei.Api.Middleware;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // The client went away (closed the tab, switched team) and its read was cancelled. Nobody is
        // waiting for an answer, so don't log it as a server error or try to write a response.
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            _logger.LogDebug("Request {Path} was cancelled by the client.", httpContext.Request.Path);
            httpContext.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
            return true;
        }

        _logger.LogError(exception, "A critical error occurred: {Message}", exception.Message);

        var problemDetails = new ProblemDetails
        {
            Title = "An internal server error occurred.",
            Detail = "Something went wrong processing your request. Please try again.",
            Status = StatusCodes.Status500InternalServerError,
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = problemDetails.Status.Value;

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
