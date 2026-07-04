# TODO

## In Progress

## Backlog — Full project review (2026-07-04)

Prioritised backlog from a whole-codebase review (8 parallel area reviews covering every
source file). Items marked `[~]` are being worked this session.

### A. Correctness bugs (small, high-value)
- [x] Lost-update fixed via optimistic locking: a stale edit now gets a 409 ("modified by another user") instead of silently overwriting newer data (PR #143)
- [x] Renaming a location/type/model/person leaves the old denormalised name in asset/cert/app lists — added cross-entity cache invalidation (PR #129)
- [x] `—` rendered as literal text in empty asset table cells (PR #129)
- [x] Applications licence-type filter values don't match the enum → filter matched nothing (PR #129)
- [x] Malformed query params (bad UUID/number) returned HTTP 500 not 400 — MethodArgumentTypeMismatch handler added (PR #129)
- [x] SSO/SAML users get 403 everywhere — `Operator` role now seeded (PR #129)
- [x] `SavedViewsController.setDefault` toggled instead of setting — now sets true (PR #129)
- [x] Audit-log rows crash on null actorName — guarded ("System") (PR #129)
- [x] `ConfirmDialog` loading state was dead — keeps dialog open while pending when the caller drives `loading` (PR #132)
- [x] Notifications mutations had no error handling; fetch errors rendered as "no notifications" — added error toasts + error state (PR #132)
- [x] `UserNotificationsController.getAll` didn't clamp pageSize — now coerced (PR #129)
- [x] `handleResponse` crashed on a 200 with empty body — now handled (PR #129)
- [x] Inconsistent REST URL naming (`/assettypes` vs `/asset-models`) — kebab-case is now primary with the old concatenated path kept as an alias (PR #132)
- [x] Office-doc uploads: pass the filename hint to Tika so OOXML/OLE2 containers resolve to docx/xlsx instead of the generic type that was rejected (PR #140)
- [x] Bi-weekly / month schedules: fixed the "Next Scan" preview (was checking "biweekly" not "every_other_week"; first_day_of_month / first_business_day now compute correctly). Backend biweekly→weekly is a documented Spring-cron limitation (PR #138)

### B. Systemic data-consistency
- [x] Reports: licence-summary now applies the computed-status correction (Active-but-expired/near → Expired/PendingRenewal), matching the dashboard/list views (PR #139)
- [x] Duplicate alerts: per-run seen-set assigns each item to its smallest matching threshold (PR #138)
- [x] Timestamps auto-managed: @CreationTimestamp/@UpdateTimestamp added to all entities with created_at/updated_at, so updatedAt advances on every update regardless of the code path (PR #144)
- [x] Optimistic locking now live: read DTOs expose entityVersion, updates send it, controllers reject a mismatched version with 409 (Asset/Certificate/Application/Person/Location) (PR #143)
- [ ] Timezone/date-only hazard end-to-end — store date-only fields as DATE/LocalDate; centralise date formatting; fix truncating daysUntilExpiry
- [x] Unique constraints added (V015, PR #142): custom_field_values(definition,entity), roles/permissions/*_types name, asset_models(type,name); migration disambiguates pre-existing duplicates first. Duplicates now return 409.
- [x] N+1 on list endpoints (DTOs flatten related names off LAZY relations) — use fetch-joins/projections — shared count-safe withFetch() Specification on Assets/Certificates/Applications/People list queries + fetch-join on CustomFieldValue loaders; 25-row assets list ~100+ queries → constant 5 (PR #155)
- [~] Alert-run: processAlerts is now @Transactional so history+notification writes are atomic (PR #138). Full crash-idempotency (claim-before-send, so an email sent then rolled back can't re-send) is a deeper design change, still open.

### C. Duplication to refactor (highest leverage)
- [ ] Extract ExpiryStatusService (status/expiry logic duplicated in 4+ places, can drift)
- [x] DepreciationCalculator extracted and used in all 4 sites (asset DTO, asset CSV export, depreciation report, dashboard book-value) — the report no longer diverges (was scale-4, now consistent scale-2) (PR #146)
- [x] Generic archivable-CRUD base + CustomFieldService (3 Type controllers ~95% identical; custom-field upsert reimplemented 4×) — ArchivableTypeCrud + CustomFieldDefinitionService (PR #153) and CustomFieldValueService unifying the 4× value upsert (PR #154)
- [x] Shared HistoryTimeline + HistoryDialog: the 4 near-identical timelines and 4 dialogs now render through one shared component each (per-entity event config passed in), ~500 lines of duplication removed (PR #147)
- [x] createEntityHooks/createEntityApi factory (5 entity hook/api modules ~90% identical; makes cross-entity invalidation declarative) — createEntityApi + createEntityHooks with declarative EntityInvalidation config; unit-tested pure entityWriteInvalidations; ~220 lines removed (PR #152)
- [x] Generic TypeFormDialog/TypesToolbar/getTypeColumns (frontend type-management triplication) — shared components under components/type-management/ + shared CustomFieldEditor/mapCustomFieldsToForm; 10 per-entity files deleted, ~400 lines removed (PR #150)
- [x] Shared CsvExportHelper with chunked/streaming export + row cap (two export mechanisms, OOM risk) — util/CsvExport.kt (stream + toResponseEntity); 6 entity exports bound their fetch + 100k row cap with truncation notice; Reports/import-template share the helper (PR #151)

### D. Dead / half-built code (finish or delete)
- [x] Removed the never-mounted dashboard drag-drop layout code and the react-grid-layout dependency (kept the working widget-visibility toggle) (PR #148)
- [x] Deleted the 7 orphaned dashboard widget components (PR #148)
- [x] Removed unused Breadcrumbs component and the never-supplied stat-card trend prop (PR #141)
- [x] Chart palette consolidated on STATUS_COLORS: the dashboard donut and the asset-summary report both colour statuses from it (fixes the report's wrong status keys that rendered grey dots) (PR #145)
- [x] Removed the non-functional disabled buttons (2FA card, "Preview Daily Report") (PR #141)
- [x] `dateFormat` + non-GBP currency settings configurable but ignored app-wide — shared settings-aware formatters (lib/format.ts) applied to ~40 date/currency sites; currency field now a valid-ISO-code Select (PR #149)

### E. Production-readiness (for work/Azure move)
- [x] Docs refreshed for the Kotlin/MySQL stack — README (PR #128), CLAUDE.md (renamed from Claude.md), docs/setup|architecture|database|api.md, and tasks/decisions.md (ADR-012/013) (PR #134)
- [x] Decommission retired apps/api (.NET) tree + drop unused Postgres container from docker-compose (PR #133)
- [x] Add tests — backend unit tests (expiry/status, JWT, password, CSV/SQL escaping, CsvExport) + Testcontainers integration suite (auth flow, token invalidation, audit emission, Flyway-from-clean) (PR #156); frontend Vitest expanded to 35 tests (format, entity-hook invalidation, zod schemas, chart colours) (PR #156)
- [x] Add CI — GitHub Actions runs backend build+test and frontend build(type-check)+test on every PR/push to main (PR #135)
- [x] Make lint a blocking CI gate — fixed the 6 eslint errors (dashboard Date.now purity; extracted ModelImageCell to fix react-refresh; renew-dialog reset via render-phase pattern; scoped disables for the 3 genuine external-sync effects: object-URL, RHF reset, async image fetch) and removed `continue-on-error` (PR #136). The 6 `incompatible-library` warnings (TanStack/RHF — unavoidable React-Compiler optimization skips, no defect) were then silenced by disabling that one rule in eslint.config.js, so `npm run lint` is fully clean (PR #137).
- [ ] Azure-readiness: Dockerfiles + IaC; move attachments to Blob Storage (local disk won't survive Container Apps); distributed rate-limit/scheduler; readiness health probe
- [x] .gitignore: Gradle build//.gradle/ (PR #133) + root *.png and apps/web/test-results/ + playwright-report/ (PR #140)

### Features (from review)
- [x] Feature 1: Renewal workflow — POST /{id}/renew for certificates & licences (PR #130)
- [x] Feature 2: Licence seat management — application↔people assignment, derived usedSeats, over-allocation block, offboard reclaim (PR #131)
- [ ] Feature 3 (deferred): Self-service account & session mgmt (forgot-password, logout/revoke, token refresh)
- [ ] Feature 4 (deferred): Barcode/QR asset labels + mobile scan check-in/out
- [ ] Feature 5 (deferred): Maintenance & service scheduling (service intervals, next-service-due alerts via existing engine)

## Done

- [x] Code review round 2 (10 fixes): DashboardController auth, date parsing validation, search limit enforcement, @Modifying/@Valid annotations, 14x unsafe .get() replaced, publisher export filter, BulkEditDialog validation, type cast safety, staleTime tuning

- [x] Comprehensive code review (16 fixes): trackDecimal null bug, LIKE injection, SSO guard, AlertsController rewrite, @Transactional annotations, V011 indexes, hasAnyFilter bug, currency £, breadcrumb hrefs, notification hook lifting

- [x] Notifications page redesign: card-based layout with urgency icons, 3-dot action menus, underline tabs

- [x] Comprehensive bug sweep (35 fixes): global exception handler, input validation, optimistic locking, React Query invalidation, ErrorBoundary, LIKE escaping, batch bulk ops, date validation, accessibility

- [x] ESLint bug fix sweep: resolved all 20 errors (unused imports, setState-in-effect, applyView declaration order, missing deps, react-refresh) + fixed purchaseDate type mismatch in asset request interfaces

- [x] File attachment support (upload/download/delete on assets, certificates, applications)
  - V009 migration, StorageService, AttachmentsController, reusable frontend component
  - Inline preview pane for images and PDFs (blob + object URL for auth)

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

- [x] Security hardening audit: input validation, audit logging, security headers, startup warnings, DB indexes, frontend guards
- [x] Phase A polish: inventory snapshot widget, enhanced search, people 360 view + offboarding, date range reports, depreciation report, print CSS
- [x] Phase C polish: advanced filtering (date range, numeric range, location, person, department, licence type filters), quick filter chips, active filter summary, saved view filter persistence
- [x] Phase B: notification centre + user alerts (in-app notifications with read/dismiss/snooze, personal alert rules, notification centre page, per-type Slack webhooks, 90-day auto-purge)

- [x] Computed PendingRenewal/Expired status: Active applications and certificates auto-compute to Expired (past expiry) or PendingRenewal (within 30 days) in API responses, dashboard counts, and list filters

## Later
- [x] Retire + sold workflow
- [x] Dedicated deactivate workflow for applications (currently via edit form status dropdown)
- [x] Bulk actions (checkbox selection + action bar)
- [x] Email alerts (warranty/cert/licence expiry) — SMTP + Microsoft Graph providers, scheduled digests, alert history
- [x] Slack webhook alerts
- [x] Reporting (5 pre-built reports: Asset Summary, Expiries, Licence Summary, Assignments, Asset Lifecycle + CSV export + Tools sidebar group)
- [x] SSO / OIDC integration (SAML 2.0 with Entra ID, SCIM 2.0 provisioning)
- [ ] Azure deployment config (deferred until ready to host)
- [x] CSV/Excel export: "Export" button on all list pages, downloads current filtered/sorted view as CSV (with selection support)
- [x] Duplicate detection: warn on create if similar record exists (fuzzy match on name/serial/email), offer to navigate to existing
- [x] Data import (CSV upload): bulk import for all 5 entity types with validation preview, error reporting, template download
- [x] Location detail page (/locations/:id): location info card, list of assets/people/certificates at that location (no map)
- [x] Depreciation tracking: depreciation method + useful life per asset type, auto-calculate book value, dashboard stat card
- [x] Prevent deleting asset types that are in use on assets (return error if assets reference the type)
- [x] Bulk edit: select multiple assets, update shared fields across all at once (location, status, assigned person, etc.)
- [x] Asset cloning: "Create another like this" button on asset detail page, pre-fills form from existing asset
- [x] Asset templates: saved presets per asset type, template picker in asset creation form
- [x] Sidebar nav grouping: collapsible groups (Inventory, Certificates, Software, Organisation) with localStorage persistence
- [x] Global design consistency: borderless tables, inline FilterChip filters, compound name cells, count badges, standardized toolbar layouts, dashboard redesign
- [x] Reassign & delete location: modal with item counts, move-to-location or unassign-all options, backend reassign-and-archive endpoint
- [x] UI consistency audit: breadcrumbs match sidebar names, all pages use PageHeader, consistent title sizes and spacing
- [x] Audit log redesign: new table styling, multi-select activity filter, color-coded badges, entity links, consistent filter components
