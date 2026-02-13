# TODO

## In Progress

## Done

- [x] Depreciation tracking (straight-line, per-asset-type defaults, computed on-the-fly, dashboard stat card)
- [x] SAML 2.0 SSO with Microsoft Entra ID (SP-initiated, JIT provisioning, toggleable)
- [x] SCIM 2.0 provisioning server (user lifecycle management from Entra)
- [x] Auth guards for SSO users (reject local login, block password reset)
- [x] Frontend SSO login button + token callback flow

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
- [x] Dashboard: stat card redesign — clickable number cards with coloured icons, fixed grid size, navigation to filtered views
- [x] Custom fields: define per asset type (inline editor in asset type dialog)
- [x] Custom fields: render dynamically in asset create/edit forms (Text, Number, Date, Boolean, SingleSelect, MultiSelect, URL)
- [x] Custom fields: toggleable columns in assets DataTable
- [x] Custom fields: display values on asset detail page

- [x] Certificates module: backend models, enums, DB migration (CertificateType, Certificate, CertificateHistory, CertificateHistoryChange)
- [x] Certificates module: CertificateTypesController + CertificatesController with paged CRUD, search, status filter
- [x] Certificates module: custom fields per certificate type (CertificateTypeId on CustomFieldDefinition)
- [x] Certificates module: audit history + change tracking via AuditService
- [x] Certificates module: dashboard endpoints (certificate-expiries, certificate-summary)
- [x] Certificates module: frontend Certificate Types page (CRUD, custom field editor)
- [x] Certificates module: frontend Certificates page (CRUD, status filter, custom fields)
- [x] Certificates module: Certificate detail page (info card, custom fields, history timeline)
- [x] Certificates module: Certificate Expiries dashboard widget
- [x] Certificates module: sidebar nav + routes for Certificate Types and Certificate detail

- [x] Person detail page (/people/:id) with info card, assigned assets table, history timeline
- [x] Person history: field-level change tracking (PersonHistory + PersonHistoryChange tables)
- [x] Person history: asset assignment events logged from checkout/checkin/retire/sell/edit
- [x] People list: clickable name links + View action in dropdown

## Next (MVP)

- [x] User authentication (JWT login, protected routes, user identity in audit logs, admin seed, frontend login page + user menu)
- [x] DataTable: server-side pagination, sorting, filtering for all list pages (Assets, Locations, Asset Types, People, Audit Logs)
- [x] DataTable: saved views per user

- [x] Applications/Licences module: backend models, enums, DB migration (ApplicationType, Application, ApplicationHistory, ApplicationHistoryChange)
- [x] Applications/Licences module: ApplicationTypesController + ApplicationsController with paged CRUD, search, status filter
- [x] Applications/Licences module: custom fields per application type (ApplicationTypeId on CustomFieldDefinition)
- [x] Applications/Licences module: audit history + change tracking via AuditService
- [x] Applications/Licences module: dashboard endpoints (licence-expiries, application-summary)
- [x] Applications/Licences module: frontend Application Types page (CRUD, custom field editor)
- [x] Applications/Licences module: frontend Applications page (CRUD, status filter, licence fields, custom fields)
- [x] Applications/Licences module: Application detail page (info card, custom fields, history timeline)
- [x] Applications/Licences module: Licence Expiries dashboard widget
- [x] Applications/Licences module: sidebar nav + routes for Application Types and Application detail

- [x] List filter overhaul: hidden statuses excluded by default (Retired/Sold for assets, Inactive for applications), opt-in via `includeStatuses` param
- [x] Application Inactive status: new enum value, badge, form option
- [x] Filter popover UI: replaced status dropdowns with popover + checkboxes on all list pages

- [x] Header enhancements: breadcrumbs, global search (Cmd+K), quick actions (+New), notifications bell, sidebar toggle polish

- [x] Backend migration: ASP.NET Core + PostgreSQL → Spring Boot Kotlin + MySQL (all 21 controllers, 33 tables, JWT auth, audit logging, CSV import/export, custom fields)

## Later
- [x] Retire + sold workflow
- [x] Dedicated deactivate workflow for applications (currently via edit form status dropdown)
- [x] Bulk actions (checkbox selection + action bar)
- [x] Email alerts (warranty/cert/licence expiry) — SMTP + Microsoft Graph providers, scheduled digests, alert history
- [x] Slack webhook alerts
- [x] Reporting (5 pre-built reports: Asset Summary, Expiries, Licence Summary, Assignments, Asset Lifecycle + CSV export + Tools sidebar group)
- [x] SSO / OIDC integration (SAML 2.0 with Entra ID, SCIM 2.0 provisioning)
- [ ] Attachment support
- [ ] Azure deployment config
- [x] CSV/Excel export: "Export" button on all list pages, downloads current filtered/sorted view as CSV (with selection support)
- [x] Duplicate detection: warn on create if similar record exists (fuzzy match on name/serial/email), offer to navigate to existing
- [x] Data import (CSV upload): bulk import for all 5 entity types with validation preview, error reporting, template download
- [x] Location detail page (/locations/:id): location info card, list of assets/people/certificates at that location (no map)
- [x] Depreciation tracking: depreciation method + useful life per asset type, auto-calculate book value, dashboard stat card
- [x] Prevent deleting asset types that are in use on assets (return error if assets reference the type)
- [ ] Bulk edit: select multiple assets, update shared fields across all at once (location, status, assigned person, etc.)
- [ ] Asset cloning: "Create another like this" button on asset detail page, pre-fills form from existing asset
- [ ] Asset kits / bundles: define kit templates (e.g. "New starter kit: laptop + monitor + keyboard"), assign or check out entire bundle at once, support bulk ordering
- [x] Sidebar nav grouping: collapsible groups (Inventory, Certificates, Software, Organisation) with localStorage persistence
- [x] Global design consistency: borderless tables, inline FilterChip filters, compound name cells, count badges, standardized toolbar layouts, dashboard redesign
