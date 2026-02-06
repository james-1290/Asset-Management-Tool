# Architecture

## Monorepo Structure

```
/
├── apps/
│   ├── web/              # React + TypeScript + Vite
│   └── api/              # ASP.NET Core Web API (.NET 10, targeting future .NET 8 LTS)
│       └── AssetManagement.Api/
├── infra/                # Docker Compose, infrastructure config
├── docs/                 # Documentation
├── tasks/                # Task tracking (todo, decisions, lessons)
├── CHANGELOG.md
└── Claude.md             # Claude Code instructions
```

## Frontend (`apps/web`)

- **Framework**: React 19 + TypeScript
- **Build tool**: Vite 7
- **UI library**: shadcn/ui (New York style) + Tailwind CSS v4
- **Routing**: React Router v7
- **Data tables**: TanStack Table v8
- **Icons**: Lucide React
- **Theme**: light/dark/system with CSS variables

### Key patterns

- Shared `Layout` component with sidebar navigation and header
- All pages rendered inside the layout via `<Outlet />`
- `@/` path alias resolves to `src/`
- shadcn/ui components in `src/components/ui/`
- Reusable `DataTable` component for all list pages

## Backend (`apps/api`)

- **Framework**: ASP.NET Core Web API
- **ORM**: Entity Framework Core with Npgsql (PostgreSQL)
- **API docs**: OpenAPI via built-in support + Scalar UI
- **API prefix**: `/api/v1/`

### Key patterns

- Controllers in `Controllers/`
- EF Core models in `Models/`, enums in `Models/Enums/`
- DTOs in `DTOs/`
- `AppDbContext` in `Data/`
- Enums stored as strings in PostgreSQL for readability
- Soft delete via `IsArchived` flag (no hard deletes)
- Auto-migration on startup in Development mode

## Infrastructure

- **Database**: PostgreSQL 16 (Docker)
- **Local dev**: Docker Compose for PostgreSQL; API and web run natively
- **Future**: Azure Container Apps + Azure Database for PostgreSQL

## Data Flow

```
Browser → Vite dev server (port 5173)
           ├── Static assets (served directly)
           └── /api/* → Proxy → ASP.NET Core API (port 5062)
                                    └── PostgreSQL (port 5432)
```
