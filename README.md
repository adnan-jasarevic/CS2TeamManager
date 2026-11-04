# CS2 Team Manager (WIP)

A full-stack web application I am currently developing to manage CS2 teams, matches, and player statistics.

## Tech Stack

**Backend:** ASP.NET Core 10, Entity Framework Core, ASP.NET Core Identity, JWT Authentication, FluentValidation  
**Frontend:** React, Vite, TypeScript, Tailwind CSS, Axios, React Router

## Current Progress

### Completed
- Clean Architecture setup (Domain / Application / Infrastructure / API layers)
- JWT Authentication (Register & Login endpoints)
- Team creation with automatic Owner role assignment (TeamMember join table)
- FluentValidation integrated via a global ValidationFilter
- GlobalExceptionHandler middleware for unhandled exceptions
- React frontend with Login, Register and Dashboard pages
- Tailwind CSS styling across all pages
- Protected routes (PrivateRoute component) using JWT token
- "My Teams" dashboard with Create Team modal
- React Router navigation with automatic redirects

## Running the Project

**JWT key:** The API needs a signing key of at least 32 characters, which is not committed. Set it once with user secrets:
```bash
dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>" --project CS2TeamManager.Api
```

**Backend:** Open in Visual Studio, set `CS2TeamManager.Api` as startup project and press F5.  
**Frontend:** In a separate terminal, navigate to `CS2TeamManager.Client` and run:
```bash
npm run dev
