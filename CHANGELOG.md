# Changelog

## 2026-02-07 04:00 - Assets CRUD end-to-end + Audit logging

- **Audit logging service**: Reusable `IAuditService` / `AuditService` — every controller write operation now creates an `AuditLog` record; asset writes also create per-asset `AssetHistory` entries
- **Assets API** (`/api/v1/assets`): Full CRUD with validation (AssetType exists, Location exists, unique AssetTag, valid Status enum). Returns flattened DTOs with `assetTypeName` and `locationName`. Soft delete via `IsArchived` flag.
- **Retrofit audit logging**: LocationsController and AssetTypesController now log Created/Updated/Archived events via `IAuditService`
- **Asset Types frontend**: Full CRUD page at `/asset-types` — mirrors Locations pattern (types, API client, React Query hooks, Zod schema, DataTable with sorting/filtering, form dialog, confirm dialog, toasts)
- **Assets frontend**: Full CRUD page at `/assets` — complex form with Select dropdowns for AssetType, Location, Status; date inputs for PurchaseDate and WarrantyExpiry; cost field; notes textarea. Status badge component with colour-coded labels.
- **Sidebar**: Added "Asset Types" nav item with Tag icon
- **shadcn/ui**: Added Select and Textarea components
- No DB migration needed — all tables already existed from initial scaffold

## 2026-02-07 02:00 - Locations page: full CRUD with API integration

- **Foundation layer**: API client (fetch wrapper with typed errors), React Query provider, Sonner toast notifications
- **Locations API integration**: Types mirroring backend DTOs, API functions, React Query hooks (useLocations, useCreateLocation, useUpdateLocation, useArchiveLocation)
- **Zod validation schema** for location forms (name required 1-200 chars, optional address/city/country)
- **Shared components**: PageHeader (title + description + actions), ConfirmDialog (AlertDialog wrapper), enhanced DataTable (shadcn Table + sorting + filtering + column visibility + toolbar slot)
- **Locations page**: Full CRUD — create/edit via form dialog, delete via confirmation dialog, filter-by-name search, sortable Name column, row action menus, loading skeleton, error state, toast feedback
- **New shadcn/ui components**: dialog, form, label, table, sonner, badge, alert-dialog
- **Dependencies added**: @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, sonner
- **Fixed**: components.json aliases from `src/` to `@/` so shadcn imports resolve during Vite build

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
