# CS2 Team Manager

A web app for amateur Counter-Strike 2 teams to manage their roster, schedule matches and track results.

> Work in progress. See [Roadmap](#roadmap) for what's next.

## Features

- **Accounts:** register and log in with email and password (JWT authentication).
- **Teams:** create up to 3 teams you own and switch between all the teams you're in.
- **Roles:** every member is an Owner, Captain or Player.
  - Owners manage roles, remove players and can transfer ownership.
  - Owners and Captains invite players and record matches.
- **Invites:** invite registered users by email. They accept or decline from the notification bell.
- **Dashboard:** win rate, member count, recent results and upcoming matches for the selected team.
- **Matches:** schedule or record matches with opponent, tournament, format (Bo1/Bo2/Bo3/Bo5), maps in play order, score and notes. Filter by upcoming or results.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | ASP.NET Core 10 Web API, Entity Framework Core 10, SQL Server |
| Auth | ASP.NET Core Identity, JWT bearer tokens |
| Validation | FluentValidation, applied by a global action filter |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, Axios |

## Project structure

The backend follows Clean Architecture: dependencies point inward, so the domain knows nothing about the database or the web.

```
CS2TeamManager.Domain          Entities and enums (Team, TeamMember, TeamInvite, Match, ...)
CS2TeamManager.Application     DTOs, services, validators, repository interfaces
CS2TeamManager.Infrastructure  EF Core DbContext, migrations, repositories, Identity
CS2TeamManager.Api             Controllers, validation filter, exception handler, startup
CS2TeamManager.Client          React frontend
```

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20 or newer
- SQL Server. The default connection string uses LocalDB (`(localdb)\mssqllocaldb`), which ships with Visual Studio on Windows. On macOS or Linux, run SQL Server in Docker and override the connection string (see below).
- The EF Core CLI, for applying migrations: `dotnet tool install --global dotnet-ef`

### 1. Configure the API

The JWT signing key is not committed. Set one of at least 32 characters with user secrets:

```bash
dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>" --project CS2TeamManager.Api
```

To use a database other than LocalDB, override the connection string the same way:

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your connection string>" --project CS2TeamManager.Api
```

The API only accepts browser requests from origins listed under `Cors:AllowedOrigins`. In Development that's `http://localhost:5173`, the Vite dev server (see `appsettings.Development.json`).

### 2. Create the database

```bash
dotnet ef database update --project CS2TeamManager.Infrastructure --startup-project CS2TeamManager.Api
```

### 3. Run the API

```bash
dotnet run --project CS2TeamManager.Api --launch-profile https
```

The API listens on `https://localhost:7185`, and Swagger UI is at `/swagger` in Development. In Visual Studio, set `CS2TeamManager.Api` as the startup project and press F5.

### 4. Run the frontend

```bash
cd CS2TeamManager.Client
npm install
npm run dev
```

Open http://localhost:5173. The frontend calls `https://localhost:7185/api` by default. To point it elsewhere, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`.

## Roadmap

Planned features:

- [Match participation](https://github.com/adnan-jasarevic/CS2TeamManager/issues/18): who played each match
- [Player stats per match](https://github.com/adnan-jasarevic/CS2TeamManager/issues/19)
- [Link a Steam account](https://github.com/adnan-jasarevic/CS2TeamManager/issues/20)
- [Delete a team](https://github.com/adnan-jasarevic/CS2TeamManager/issues/21)
- [Leave a team](https://github.com/adnan-jasarevic/CS2TeamManager/issues/22)

Planned cleanup:

- Merge the two user models (Identity `AppUser` and the unused Domain `User`)
- Consistent `Result<T>` responses and status codes across services
- Validators for all request DTOs
- Store match maps as structured data instead of a comma-separated string
- Responsive layout and frontend cleanup
- Tests and CI
