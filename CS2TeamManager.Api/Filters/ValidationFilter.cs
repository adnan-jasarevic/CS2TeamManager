using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CS2TeamManager.Api.Filters;

public class ValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var argument = context.ActionArguments.Values.FirstOrDefault(v => v != null);

        if (argument != null)
        {
            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            var validator = context.HttpContext.RequestServices.GetService(validatorType) as IValidator;

            if (validator != null)
            {
                var validationContext = new ValidationContext<object>(argument);
                var validationResult = await validator.ValidateAsync(validationContext);

                if (!validationResult.IsValid)
                {
                    var errors = validationResult.Errors
                        .GroupBy(x => x.PropertyName)
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(x => x.ErrorMessage).ToArray()
                        );

                    var problemDetails = new ValidationProblemDetails(errors)
                    {
                        Title = "One or more validation errors occurred.",
                        Status = StatusCodes.Status400BadRequest,
                        Instance = context.HttpContext.Request.Path
                    };

                    context.Result = new BadRequestObjectResult(problemDetails);

                    return;
                }
            }
        }

        await next();
    }
}
