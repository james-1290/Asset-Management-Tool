# TODO

## Done

- [x] Monorepo structure (apps/web, apps/api, infra, docs, tasks)
- [x] Backend: .NET Web API with EF Core + PostgreSQL
- [x] Backend: DB models (Users, Roles, Permissions, Locations, AssetTypes, Assets, AssetHistory, AuditLog, CustomFields)
- [x] Backend: Initial migration
- [x] Backend: Health, Locations CRUD, AssetTypes CRUD endpoints
- [x] Backend: Swagger/OpenAPI + Scalar UI
- [x] Frontend: React + Vite + TypeScript
- [x] Frontend: Tailwind CSS v4 + shadcn/ui (New York)
- [x] Frontend: Shared layout (sidebar + header)
- [x] Frontend: Theme toggle (light/dark/system)
- [x] Frontend: Placeholder pages (Dashboard, Assets, Certificates, Applications, Locations, Audit Log, Settings)
- [x] Frontend: DataTable component placeholder (TanStack Table)
- [x] Frontend: API client (fetch wrapper), React Query provider, Sonner toasts
- [x] Frontend: Locations CRUD page wired to backend API (create, edit, delete, search, sort)
- [x] Frontend: Reusable patterns — PageHeader, ConfirmDialog, DataTable with sorting/filtering/toolbar
- [x] Frontend: Form pattern — react-hook-form + zod validation + shadcn Form components
- [x] Fix: components.json aliases (src/ → @/) and Vite proxy port (5062 → 5115)
- [x] Backend: Audit logging service (IAuditService + AuditService)
- [x] Backend: Assets CRUD endpoint with validation (AssetType/Location FK, unique AssetTag, Status enum)
- [x] Backend: Retrofit audit logging to Locations + AssetTypes controllers
- [x] Frontend: Asset Types CRUD page (types, API, hooks, schema, DataTable, form dialog)
- [x] Frontend: Assets CRUD page (complex form with selects, dates, cost, notes; status badges)
- [x] Frontend: Sidebar nav item for Asset Types
- [x] Bug fix: Asset date serialisation (YYYY-MM-DD → YYYY-MM-DDT00:00:00)
- [x] Backend: Asset history endpoint (GET /api/v1/assets/{id}/history)
- [x] Frontend: Asset detail page (/assets/:id) with info card + history timeline
- [x] Frontend: Clickable asset tag/name links in DataTable → detail page
- [x] Docker Compose for PostgreSQL
- [x] .env.example files
- [x] Documentation (setup, architecture, database, API, UX guidelines)
- [x] Bug fix: Dates sent with UTC Z suffix for timestamp with time zone columns
- [x] Field-level change tracking in asset history (AssetHistoryChanges table, old/new values shown inline)
- [x] Asset history limit + "View All History" dialog on asset detail page
- [x] Backend: EntityName column on AuditLog (denormalized at write time)
- [x] Frontend: Audit log UI polish (colour-coded action badges, tooltip on truncated details)
- [x] Frontend: Assets page reads ?status= URL param and pre-filters DataTable
- [x] Dashboard: 7 initial widgets (stat cards, status breakdown pie, warranty expiries, assets by type/location, recent activity, checked out)
- [x] Dashboard: widget customization popover (toggle widgets on/off, persisted to localStorage)
- [x] Dashboard: clickable pie chart segments → filtered assets page
- [x] Dashboard: £ icon on Total Value card, warranty timeframe selector (7/14/30/60/90d)
- [x] Dashboard: 4 additional widgets (Recently Added, Assets by Age, Unassigned Assets, Value by Location)
- [x] Dashboard: free-form grid via react-grid-layout v2 (drag to any cell, resize by edges, vertical compaction)
- [x] Dashboard: Total Assets and Total Value as independent resizable widgets
- [x] Dashboard: colourful 10-colour palette for bar charts

## Next (MVP)

- [ ] Custom fields: define + render in forms
- [ ] Custom fields: display in DataTable columns
- [ ] User authentication (basic username/password login)
- [ ] DataTable: server-side pagination, sorting, filtering (client-side sorting/filtering done)
- [ ] DataTable: saved views per user

## Later

- [ ] Certificates module (models + CRUD + UI)
- [ ] Applications/Licences module (models + CRUD + UI)
- [ ] Retire + sold workflow
- [ ] Bulk actions (checkbox selection + action bar)
- [ ] Email alerts (warranty/cert/licence expiry)
- [ ] Slack webhook alerts
- [ ] Reporting
- [ ] SSO / OIDC integration
- [ ] Attachment support
- [ ] Azure deployment config
