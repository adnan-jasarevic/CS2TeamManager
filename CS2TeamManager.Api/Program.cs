using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Application.Services;
using CS2TeamManager.Infrastructure.Identity;
using CS2TeamManager.Infrastructure.Persistence;
using CS2TeamManager.Infrastructure.Repositories;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// CORS Config
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p =>
        p.AllowAnyOrigin()
         .AllowAnyMethod()
         .AllowAnyHeader());
});

// dbcontext registration
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// identity sys registration
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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});

// controllers
builder.Services.AddControllers(options =>
{
    options.Filters.Add<CS2TeamManager.Api.Filters.ValidationFilter>();
});

builder.Services.AddValidatorsFromAssemblyContaining<CS2TeamManager.Application.DTOs.CreateTeamDto>();

builder.Services.AddExceptionHandler<CS2TeamManager.Api.Middleware.GlobalExceptionHandler>();
builder.Services.AddProblemDetails();


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DEPENDENCY INJECTION FOR REPOS & SERVICES (HEAVEN/HELL ON EARTH)
builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<ITeamService, TeamService>();
builder.Services.AddScoped<IIdentityService, CS2TeamManager.Infrastructure.Services.IdentityService>();
builder.Services.AddScoped<IMatchRepository, MatchRepository>();
builder.Services.AddScoped<IMatchService, MatchService>();

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
