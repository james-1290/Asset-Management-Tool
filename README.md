# Asset Management Tool

A local-first, Azure-ready multi-user asset management system for IT/admin teams.

## Quick Start

```bash
# 1. Start PostgreSQL
cd infra && docker compose up -d

# 2. Start the API (in a new terminal)
cd apps/api/AssetManagement.Api && dotnet run

# 3. Start the frontend (in a new terminal)
cd apps/web && npm install && npm run dev
```

- Frontend: http://localhost:5173
- API docs: http://localhost:5062/scalar/v1

## Documentation

- [Setup Guide](docs/setup.md)
- [Architecture](docs/architecture.md)
- [Database Schema](docs/database.md)
- [API Reference](docs/api.md)
- [UX Guidelines](docs/ux-guidelines.md)

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: ASP.NET Core Web API + EF Core
- **Database**: PostgreSQL
- **Infrastructure**: Docker Compose (local), Azure (future)
