# Changelog

## 2026-02-07 00:30 - Polish sidebar header + collapse behaviour

- Moved collapse/expand toggle from sidebar footer to sidebar header
- Toggle is now icon-only (ChevronLeft) next to "Asset Manager" title
- Collapsed state shows circular "AM" brand badge (clickable to expand)
- Fixed divider alignment: sidebar header now uses `h-14` to match main content header
- Removed SidebarFooter entirely (toggle lives in header)
- No changes to shadcn/ui primitives or layout.tsx

## 2026-02-06 21:00 - Stricter git workflow rules

- Updated CLAUDE.md: Claude must never merge into main or push to main
- Merging to main is only via GitHub PR or by the user manually
- Only feature/fix/docs/chore/spike branches may be pushed to origin

## 2026-02-06 20:40 - Initial project scaffold

- Created monorepo structure: `apps/web`, `apps/api`, `infra`, `docs`, `tasks`
- **Backend** (apps/api): ASP.NET Core Web API (.NET 10)
  - EF Core + PostgreSQL (Npgsql) with initial migration
  - DB models: Users, Roles, Permissions, Locations, AssetTypes, Assets, AssetHistory, AuditLog, CustomFieldDefinitions, CustomFieldValues
  - Endpoints: Health (`/api/v1/health`), Locations CRUD (`/api/v1/locations`), AssetTypes CRUD (`/api/v1/assettypes`)
  - OpenAPI + Scalar API docs
  - CORS configured for frontend dev server
  - Auto-migration on startup in Development mode
- **Frontend** (apps/web): React 19 + TypeScript + Vite 7
  - Tailwind CSS v4 + shadcn/ui (New York style)
  - Shared layout with collapsible sidebar and header
  - Theme toggle: light/dark/system
  - Placeholder pages: Dashboard, Assets, Certificates, Applications/Licences, Locations, Audit Log, Settings
  - DataTable component placeholder (TanStack Table)
  - React Router v7 routing
- **Infrastructure**: Docker Compose with PostgreSQL 16 (persisted volume)
- **Documentation**: setup.md, architecture.md, database.md, api.md, ux-guidelines.md
- **Task tracking**: todo.md, decisions.md, lessons.md
- `.env.example` files for web, api, and infra
- `.gitignore` for the monorepo
