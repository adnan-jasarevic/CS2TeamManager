namespace RosterSensei.Application.Common;

public enum ErrorType
{
    // The request breaks a rule (bad input, limit reached, wrong state). Maps to 400.
    Validation,
    // The user is signed in but may not do this. Maps to 403.
    Forbidden,
    // The team, member, invite or event doesn't exist. Maps to 404.
    NotFound,
    // Someone else changed the data since the user loaded it. Maps to 409.
    Conflict
}

public class Result<T>
{
    public bool Success { get; private set; }
    public T? Data { get; private set; }
    public string? ErrorMessage { get; private set; }
    public ErrorType ErrorType { get; private set; }

    private Result(bool success, T? data, string? errorMessage, ErrorType errorType)
    {
        Success = success;
        Data = data;
        ErrorMessage = errorMessage;
        ErrorType = errorType;
    }

    public static Result<T> SuccessResult(T data)
        => new Result<T>(true, data, null, default);

    public static Result<T> Failure(string errorMessage, ErrorType errorType = ErrorType.Validation)
        => new Result<T>(false, default, errorMessage, errorType);

    public static Result<T> Forbidden(string errorMessage)
        => Failure(errorMessage, ErrorType.Forbidden);

    public static Result<T> NotFound(string errorMessage)
        => Failure(errorMessage, ErrorType.NotFound);

    public static Result<T> Conflict(string errorMessage)
        => Failure(errorMessage, ErrorType.Conflict);
}
