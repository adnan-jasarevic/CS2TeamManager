using RosterSensei.Application.Interfaces;
using RosterSensei.Application.Services;
using RosterSensei.Infrastructure.Identity;
using RosterSensei.Infrastructure.Persistence;
using RosterSensei.Infrastructure.Repositories;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// HMAC-SHA256 needs a key of at least 256 bits; fail at startup instead of on the first login.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or shorter than 32 bytes. Set it with: " +
        "dotnet user-secrets set \"Jwt:Key\" \"<at least 32 random characters>\" --project RosterSensei.Api");
}

// CORS: only the frontend origins listed under Cors:AllowedOrigins may call the API.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p =>
        p.WithOrigins(allowedOrigins)
         .AllowAnyMethod()
         .AllowAnyHeader());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<AppUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();


builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddControllers(options =>
{
    options.Filters.Add<RosterSensei.Api.Filters.ValidationFilter>();
});

builder.Services.AddValidatorsFromAssemblyContaining<RosterSensei.Application.DTOs.CreateTeamDto>();

builder.Services.AddExceptionHandler<RosterSensei.Api.Middleware.GlobalExceptionHandler>();
builder.Services.AddProblemDetails();


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<ITeamService, TeamService>();
builder.Services.AddScoped<IIdentityService, RosterSensei.Infrastructure.Services.IdentityService>();
builder.Services.AddScoped<IAuthService, RosterSensei.Infrastructure.Services.AuthService>();
builder.Services.AddScoped<IMatchRepository, MatchRepository>();
builder.Services.AddScoped<IMatchService, MatchService>();
builder.Services.AddScoped<ITeamEventRepository, TeamEventRepository>();
builder.Services.AddScoped<ITeamEventService, TeamEventService>();

var app = builder.Build();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
