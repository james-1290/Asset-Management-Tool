# Changelog

## 2026-02-07 17:24 - Dashboard reflow, drag-and-drop reordering, 4 new widgets

- **Frontend**: Dashboard grid now reflows — hiding widgets no longer leaves empty gaps (flat single grid replaces paired 2-column rows)
- **Frontend**: Drag-and-drop widget reordering via @dnd-kit — drag handle appears on hover, order persisted to localStorage
- **Frontend**: Accessible drag support (pointer + keyboard sensors)
- **Backend**: 4 new dashboard endpoints: `GET /api/v1/dashboard/recently-added?limit=N`, `assets-by-age`, `unassigned`, `value-by-location`
- **Frontend**: 4 new widgets — Recently Added (list), Assets by Age (horizontal bar chart), Unassigned Assets (list), Value by Location (bar chart with £ formatting)
- **Frontend**: New widgets appear in Customize popover and can be toggled/reordered
- **Frontend**: Existing user preferences auto-merge new widget IDs on load
- **Dependencies**: Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

## 2026-02-07 17:13 - Dashboard widget polish

- **Frontend**: Status breakdown pie chart — removed segment labels (legend+tooltip remain), clicking a segment navigates to `/assets?status=X`
- **Frontend**: Assets page reads `?status=` URL param and pre-filters the table; status dropdown in toolbar syncs with URL
- **Frontend**: Total Value card icon changed from $ to £ (PoundSterling)
- **Frontend**: Warranty expiries widget — added settings cog with timeframe popover (7d/14d/30d/60d/90d)
- **Frontend**: DataTable now accepts `initialColumnFilters` prop

## 2026-02-07 16:20 - Dashboard with customizable widgets

- **Backend**: New `DashboardController` with 6 endpoints: `GET /api/v1/dashboard/summary`, `status-breakdown`, `warranty-expiries?days=N`, `assets-by-type`, `assets-by-location`, `checked-out`
- **Backend**: Added `limit` query parameter to `GET /api/v1/auditlogs` for recent activity widget
- **Frontend**: Full dashboard page with 7 widgets — stat cards (total assets + total value), status breakdown pie chart, warranty expiries list, assets by type/location bar charts, recent activity feed, checked out assets list
- **Frontend**: Widget customization — Settings popover with checkboxes to toggle widgets on/off, preferences persisted to localStorage
- **Frontend**: Each widget fetches independently via React Query (own loading/error states, disabled widgets skip API calls)
- **Frontend**: Charts via recharts library; colour-coded urgency badges on warranty expiries (red <=7d, amber <=14d)
- **Dependencies**: Added `recharts`, shadcn `checkbox` component

## 2026-02-07 14:56 - Add entity name to audit log

- **Backend**: Added `EntityName` column to `AuditLog` model (nullable, for backwards-compatibility)
- **Backend**: All controllers now pass entity name when logging audit entries (denormalized at write time)
- **Backend**: Audit log search also matches on entity name
- **Frontend**: Renamed "Entity ID" column to "Entity" — shows entity name, falls back to truncated ID for old records
- **DB Migration**: `AddEntityNameToAuditLog` — adds nullable `EntityName` column

## 2026-02-07 14:40 - Audit log UI polish

- **Frontend**: Colour-coded action badges (green=Created/CheckedIn, blue=Updated, gray=Archived, amber=CheckedOut)
- **Frontend**: Tooltip on truncated details column to reveal full text on hover

## 2026-02-07 14:29 - Audit log UI page

- **Backend**: New read-only `GET /api/v1/auditlogs` endpoint with optional `entityType`, `action`, and `search` query filters
- **Frontend**: Full audit log page with DataTable showing timestamp, actor, action, entity type, entity ID, source, and details
- **Frontend**: Client-side filtering toolbar — text search on details, entity type select, action select
- **Frontend**: Asset entity IDs link to asset detail page

## 2026-02-07 14:14 - Check-in / check-out workflow

- **Backend**: New `POST /api/v1/assets/{id}/checkout` and `POST /api/v1/assets/{id}/checkin` endpoints
- **Checkout**: Validates asset is Available or Assigned, sets status to CheckedOut and assigns person
- **Checkin**: Validates asset is CheckedOut, sets status to Available and clears assignment
- **Audit**: Both actions log field-level changes (Status, Assigned To) to asset history timeline
- **Frontend**: Checkout dialog with person combobox + optional notes
- **Frontend**: Checkin dialog with confirmation + optional notes
- **Frontend**: Check Out / Check In buttons on asset detail page (shown contextually based on status)
- No DB migration needed — existing enums and fields already supported CheckedOut/CheckedIn

## 2026-02-07 13:39 - Fix date bug + history improvements

- **Bug fix**: Dates now sent with UTC `Z` suffix (e.g. `2025-01-15T00:00:00Z`) — fixes Npgsql rejection of `DateTime(Kind=Unspecified)` for `timestamp with time zone` columns
- **Field-level change tracking**: Edit history now records exactly which fields changed, with old and new values. New `AssetHistoryChanges` table + `AssetHistoryChange` model.
- **History timeline shows changes**: "Edited" entries display inline list of changed fields (e.g. `Name: "MacBook" → "MacBook Pro"`)
- **History limit + View All**: Asset detail sidebar caps history at 5 entries. "View All History" button opens a scrollable dialog with the full timeline.
- **New endpoint param**: `GET /api/v1/assets/{id}/history?limit=N` — optional limit query parameter
- **DB migration**: `AddAssetHistoryChanges` — creates `AssetHistoryChanges` table with FK to `AssetHistory`

## 2026-02-06 23:53 - Asset detail page + date bug fix

- **Bug fix**: Creating/editing assets with dates (Purchase Date, Warranty Expiry) now works — frontend converts `"YYYY-MM-DD"` to `"YYYY-MM-DDT00:00:00"` before sending to API
- **History endpoint**: `GET /api/v1/assets/{id}/history` — returns `AssetHistoryDto` list ordered by timestamp descending, includes performer display name
- **Asset detail page** (`/assets/:id`): Shows asset info in two-column card layout + history timeline sidebar. Edit button opens existing form dialog. Back button returns to list.
- **History timeline component**: Vertical timeline with colour-coded dots per event type (Created, Edited, Assigned, etc.)
- **Clickable table links**: Asset Tag and Name columns in the assets DataTable are now links to the detail page
- **New shadcn component**: Card
- No DB migration needed

## 2026-02-06 23:24 - Asset assignment: User → Person + searchable combobox

- **Breaking DB change**: `Asset.AssignedUserId` (FK to Users) replaced with `Asset.AssignedPersonId` (FK to People). Migration `ChangeAssetAssignmentToPersonFromUser` drops old column and adds new one.
- **People search endpoint**: `GET /api/v1/people/search?q=&limit=5` — lightweight `{id, fullName}` results, ILike filtering, returns first 5 by default
- **PersonCombobox component**: Searchable combobox (Popover + Command) replaces static Select for "Assigned To" field. Shows 5 people initially, narrows as user types, includes "None" option.
- **Frontend types/schema**: `assignedUserId`/`assignedUserName` → `assignedPersonId`/`assignedPersonName` across types, schema, columns, form, and page
- **Removed `useUsers` dependency** from assets page — combobox handles its own data fetching via `usePeopleSearch` hook
- **New shadcn components**: popover, command (with cmdk dependency)

## 2026-02-06 23:03 - People management (CRUD)

- **People model**: New `Person` entity (FullName, Email, Department, JobTitle, LocationId FK) with soft delete via `IsArchived`
- **People API** (`/api/v1/people`): Full CRUD — list active people (with location name), get by ID, create, update, soft delete. LocationId validated against active locations. All writes audit-logged.
- **People frontend**: Full CRUD page at `/people` — DataTable with sortable Full Name column, filter-by-name toolbar, form dialog with Location dropdown, confirm dialog for delete, toast feedback
- **Sidebar**: Added "People" nav item with Users icon after Locations
- **DB migration**: `AddPeopleTable` — creates `People` table with FK to `Locations` (SetNull on delete)

## 2026-02-06 22:45 - Assign user to asset

- **Users API** (`GET /api/v1/users`): Read-only endpoint returning active users ordered by display name
- **Asset assignment**: `AssignedUserId` and `AssignedUserName` added to Asset DTOs and API request/response
- **Validation**: AssignedUserId (if provided) must reference an existing active user
- **Frontend**: "Assigned To" dropdown in Add/Edit Asset form with auto-status logic — selecting a user auto-sets status to "Assigned"; clearing user reverts to "Available" (unless manually changed)
- **DataTable**: "Assigned To" column showing assigned user's display name
- No DB migration needed — `AssignedUserId` FK already exists on Assets table

## 2026-02-06 22:28 - Assets CRUD end-to-end + Audit logging

- **Audit logging service**: Reusable `IAuditService` / `AuditService` — every controller write operation now creates an `AuditLog` record; asset writes also create per-asset `AssetHistory` entries
- **Assets API** (`/api/v1/assets`): Full CRUD with validation (AssetType exists, Location exists, unique AssetTag, valid Status enum). Returns flattened DTOs with `assetTypeName` and `locationName`. Soft delete via `IsArchived` flag.
- **Retrofit audit logging**: LocationsController and AssetTypesController now log Created/Updated/Archived events via `IAuditService`
- **Asset Types frontend**: Full CRUD page at `/asset-types` — mirrors Locations pattern (types, API client, React Query hooks, Zod schema, DataTable with sorting/filtering, form dialog, confirm dialog, toasts)
- **Assets frontend**: Full CRUD page at `/assets` — complex form with Select dropdowns for AssetType, Location, Status; date inputs for PurchaseDate and WarrantyExpiry; cost field; notes textarea. Status badge component with colour-coded labels.
- **Sidebar**: Added "Asset Types" nav item with Tag icon
- **shadcn/ui**: Added Select and Textarea components
- No DB migration needed — all tables already existed from initial scaffold

## 2026-02-06 21:57 - Locations page: full CRUD with API integration

- **Foundation layer**: API client (fetch wrapper with typed errors), React Query provider, Sonner toast notifications
- **Locations API integration**: Types mirroring backend DTOs, API functions, React Query hooks (useLocations, useCreateLocation, useUpdateLocation, useArchiveLocation)
- **Zod validation schema** for location forms (name required 1-200 chars, optional address/city/country)
- **Shared components**: PageHeader (title + description + actions), ConfirmDialog (AlertDialog wrapper), enhanced DataTable (shadcn Table + sorting + filtering + column visibility + toolbar slot)
- **Locations page**: Full CRUD — create/edit via form dialog, delete via confirmation dialog, filter-by-name search, sortable Name column, row action menus, loading skeleton, error state, toast feedback
- **New shadcn/ui components**: dialog, form, label, table, sonner, badge, alert-dialog
- **Dependencies added**: @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, sonner
- **Fixed**: components.json aliases from `src/` to `@/` so shadcn imports resolve during Vite build

## 2026-02-06 21:26 - Polish sidebar header + collapse behaviour

- Moved collapse/expand toggle from sidebar footer to sidebar header
- Toggle is now icon-only (ChevronLeft) next to "Asset Manager" title
- Collapsed state shows circular "AM" brand badge (clickable to expand)
- Fixed divider alignment: sidebar header now uses `h-14` to match main content header
- Removed SidebarFooter entirely (toggle lives in header)
- No changes to shadcn/ui primitives or layout.tsx

## 2026-02-06 20:56 - Stricter git workflow rules

- Updated CLAUDE.md: Claude must never merge into main or push to main
- Merging to main is only via GitHub PR or by the user manually
- Only feature/fix/docs/chore/spike branches may be pushed to origin

## 2026-02-06 20:42 - Initial project scaffold

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
