namespace CS2TeamManager.Application.Common;

public class Result<T>
{
    public bool Success { get; private set; }
    public T? Data { get; private set; }
    public string? ErrorMessage { get; private set; }

    private Result(bool success, T? data, string? errorMessage)
    {
        Success = success;
        Data = data;
        ErrorMessage = errorMessage;
    }

    public static Result<T> SuccessResult(T data)
        => new Result<T>(true, data, null);

    public static Result<T> Failure(string errorMessage)
        => new Result<T>(false, default, errorMessage);
}
