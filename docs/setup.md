# Local Development Setup (macOS)

## Prerequisites

- **Node.js** v20+ (v25 tested)
- **.NET SDK** 10.0+ (see [decisions](../tasks/decisions.md) re: .NET version)
- **Docker** and **Docker Compose**
- **EF Core tools**: `dotnet tool install --global dotnet-ef`

## 1. Start PostgreSQL

```bash
cd infra
docker compose up -d
```

This starts PostgreSQL on port 5432 with a persisted volume. Default credentials: `postgres` / `postgres`, database `assetmgmt`.

## 2. Run the API

```bash
cd apps/api/AssetManagement.Api
dotnet run
```

The API starts on `http://localhost:5062` by default. On first run in Development mode, it auto-applies EF Core migrations.

- Scalar API docs: `http://localhost:5062/scalar/v1`
- OpenAPI spec: `http://localhost:5062/openapi/v1.json`

## 3. Run the Frontend

```bash
cd apps/web
npm install   # first time only
npm run dev
```

The frontend starts on `http://localhost:5173`. API calls are proxied to `http://localhost:5062` via Vite config.

## 4. Run Both (quick start)

Open two terminals:

```bash
# Terminal 1: Database
cd infra && docker compose up -d

# Terminal 2: API
cd apps/api/AssetManagement.Api && dotnet run

# Terminal 3: Frontend
cd apps/web && npm run dev
```

## Environment Files

Copy `.env.example` files if you need to override defaults:

```bash
cp infra/.env.example infra/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Database Migrations

Migrations are auto-applied on API startup in Development mode. To manage manually:

```bash
cd apps/api/AssetManagement.Api

# Create a new migration
dotnet ef migrations add <MigrationName> --output-dir Data/Migrations

# Apply migrations
dotnet ef database update

# Roll back
dotnet ef database update <PreviousMigrationName>
```

## Building for Production

```bash
# Frontend
cd apps/web && npm run build

# Backend
cd apps/api/AssetManagement.Api && dotnet publish -c Release
```
