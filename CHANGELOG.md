# Changelog

## 2026-02-10 22:01 - Reports Page + Tools Sidebar Group

- Added **Reports** page with 5 pre-built reports: Asset Summary, Upcoming Expiries, Licence Summary, Assignments, Asset Lifecycle
- Added `ReportsController` with 5 endpoints: `/api/v1/reports/asset-summary`, `/expiries`, `/licence-summary`, `/assignments`, `/asset-lifecycle`
- All report endpoints support `?format=csv` for CSV export
- Added new **Tools** collapsible group in sidebar with Reports and Import Data
- Moved Import from Settings tab to standalone page at `/tools/import`
- Settings page now has 4 tabs: Profile, Users, Alerts, System

## 2026-02-10 21:50 - Application Deactivate/Reactivate Workflow

- Added dedicated `POST /api/v1/applications/{id}/deactivate` and `/reactivate` endpoints
- Added `DeactivatedDate` column to Application model (DB migration: AddApplicationDeactivatedDate)
- New `DeactivateApplicationDialog` component with optional notes and date fields
- Detail page shows Deactivate button (for active apps) or Reactivate button (for inactive apps)
- List page row dropdown includes Deactivate action
- Both actions create audit log entries with status change tracking

## 2026-02-10 19:32 - Sidebar Nav Grouping

- Grouped sidebar nav items into collapsible sections: Inventory, Certificates, Software, Organisation
- Dashboard, Audit Log, and Settings remain as standalone top-level items
- Groups expand/collapse on click with chevron rotation animation
- Open/closed state persisted to localStorage
- Active child highlights parent group when collapsed
- Installed shadcn collapsible component (radix-ui)

## 2026-02-10 15:10 - CSV Data Import

- Added Import tab to Settings page (admin only) for bulk CSV import
- Backend: new `ImportController` with 3 endpoints per entity type:
  - `GET /api/v1/import/{entityType}/template` — download CSV template with headers + example rows
  - `POST /api/v1/import/{entityType}/validate` — upload CSV, parse & validate, return row-by-row results
  - `POST /api/v1/import/{entityType}/execute` — upload CSV, create valid records, skip invalid
- Supports 5 entity types: locations, people, assets, certificates, applications
- Validation includes: required fields, max length, enum parsing (case-insensitive), FK resolution by name, asset tag uniqueness, email format, date format (yyyy-MM-dd), boolean parsing, decimal parsing
- Limits: 5MB file size, 10,000 rows max
- Each imported record gets an audit log entry ("Imported via CSV import")
- Frontend: wizard-style ImportTab component with 4 steps (select → upload → preview → results)
- Frontend: added `uploadFile()` method to api-client for multipart form uploads
- New frontend types (`import.ts`) and API module (`import.ts`)

## 2026-02-10 14:05 - CSV Export on All List Pages

- Added `GET /api/v1/{entity}/export` endpoints to all 6 controllers (Assets, Locations, People, Certificates, Applications, AuditLogs)
- Each export endpoint accepts the same filter/sort params as the paged GET, but returns all matching rows as CSV
- Installed CsvHelper 33.1.0 NuGet package for CSV generation
- Added `downloadCsv()` method to frontend api-client for blob download
- Created reusable `ExportButton` component (Download icon + loading spinner)
- Added export functions to all 6 frontend API modules
- Added Export button to toolbar of all 6 list pages (Assets, Locations, People, Certificates, Applications, Audit Log)
- Export respects current filters/sorting — CSV matches what the user sees
- Refactored each controller to extract shared `BuildFilteredQuery` and `ApplySorting` methods (reused by both paged GET and export)

## 2026-02-10 08:31 - Location Detail Page

- Added location detail page at `/locations/:id` with details card, assets table, and people table
- Backend: new `GET /api/v1/locations/{id}/assets` and `GET /api/v1/locations/{id}/people` endpoints
- Backend: new `LocationAssetDto` and `LocationPersonDto` DTOs
- Frontend: new `useLocation`, `useLocationAssets`, `useLocationPeople` hooks
- Location names in the list page are now clickable links to the detail page
- Detail page includes Edit and Archive actions (reuses existing dialogs)

## 2026-02-10 08:02 - Header Enhancements (5 Features)

- **Feature 1 — Sidebar Toggle**: Added `SidebarTrigger` to the header for collapsing/expanding the sidebar
- **Feature 2 — Breadcrumbs**: Route-aware breadcrumbs in the header; static segments from route map, dynamic entity names resolved from React Query cache; settings tab names shown as nested crumbs
- **Feature 3 — Global Search (Cmd+K)**: New `SearchController` (`GET /api/v1/search?q=term`) searches across Assets (name, tag), Certificates, Applications, People, and Locations; frontend command palette with debounced search, grouped results, and keyboard navigation
- **Feature 4 — Quick Actions (+New)**: Dropdown menu in header to create any entity (Asset, Certificate, Application, Person, Location) from anywhere; reuses existing form dialogs and mutation hooks
- **Feature 5 — Notifications Bell**: New `NotificationsController` (`GET /api/v1/notifications/summary`) returns upcoming expiry counts using alert threshold settings as lookahead window; frontend bell icon with badge count and popover listing expiring warranties, certificates, and licences with "expires in X days" labels
- **Header layout**: `[SidebarTrigger] [Breadcrumbs ...flex-1...] [Search ⌘K] [+New] [🔔 Bell] [🌓 Theme] [👤 Avatar]`
- **New backend files**: `SearchController.cs`, `SearchDtos.cs`, `NotificationsController.cs`, `NotificationDtos.cs`
- **New frontend files**: `breadcrumbs.tsx`, `command-search.tsx`, `quick-actions.tsx`, `notifications-bell.tsx`, `search.ts`, `notifications.ts`, `use-search.ts`, `use-notifications.ts`
- **shadcn component installed**: `breadcrumb`

## 2026-02-08 22:07 - Settings Page with Profile, Users, Alerts & System Config

- **Backend**: Added `SystemSetting` model (key-value store, `Key` as PK)
- **Backend**: Added `ThemePreference` to `User` model
- **Backend**: EF Migration: `AddSystemSettingsAndUserTheme`
- **Backend**: Seed data: "User" role, default system settings (org name, currency, date format, page size), default alert settings (thresholds, SMTP, Slack)
- **Backend**: New `ProfileController` — `PUT /api/v1/profile` (update display name, email, theme), `PUT /api/v1/profile/password` (change password)
- **Backend**: New `SettingsController` — `GET/PUT /api/v1/settings/system` and `GET/PUT /api/v1/settings/alerts` (admin only for writes)
- **Backend**: New `RolesController` — `GET /api/v1/roles` (admin only)
- **Backend**: Expanded `UsersController` — full CRUD: list (with `?includeInactive`), get by ID, create, update (name/email/role/active), reset password (all admin-only except list)
- **Backend**: `UserProfileResponse` now includes `themePreference`
- **Frontend**: Settings page at `/settings` with tabbed layout (URL-driven `?tab=profile|users|alerts|system`)
- **Frontend**: Profile tab — edit display name, email, theme preference; change password with validation
- **Frontend**: Users tab (admin only) — DataTable with role badges & status badges, add/edit user dialogs, reset password dialog
- **Frontend**: Alerts tab (admin only) — toggle switches for warranty/certificate/licence alerts, configurable thresholds, SMTP config, Slack webhook, recipients
- **Frontend**: System tab (admin only) — organisation name, currency, date format, default page size
- **Frontend**: Auth context now exposes `isAdmin` boolean and `updateUser()` method; syncs theme preference to localStorage on login
- **Frontend**: User menu now has "Profile" link that navigates to `/settings?tab=profile`
- **Frontend**: Added shadcn `Tabs` and `Switch` UI components

## 2026-02-08 21:49 - Person Detail Page with Full History Tracking

- **Backend**: Added `PersonHistory` + `PersonHistoryChange` tables (EF migration: `AddPersonHistory`)
- **Backend**: Added `PersonHistoryEventType` enum (Created, Edited, Archived, Restored, AssetAssigned, AssetUnassigned, AssetCheckedOut, AssetCheckedIn)
- **Backend**: `AuditService` now creates `PersonHistory` records with field-level change tracking for Person entities
- **Backend**: Asset checkout/checkin/retire/sell/update now log entries to person history when assignment changes
- **Backend**: `PeopleController.Update` now tracks field-level changes (Full Name, Email, Department, Job Title, Location)
- **Backend**: Added `GET /api/v1/people/{id}/history` endpoint — returns person history with field-level changes
- **Backend**: Added `GET /api/v1/people/{id}/assets` endpoint — returns non-archived assets assigned to a person
- **Frontend**: New person detail page at `/people/:id` with info card, assigned assets table, and history timeline
- **Frontend**: Person history timeline shows field-level changes (matching asset history pattern)
- **Frontend**: Person name in People list is now a clickable link to detail page
- **Frontend**: Added "View" action to person row dropdown menu
- **Frontend**: History timeline with "View All History" dialog for full audit trail

## 2026-02-08 20:58 - Dashboard Stat Cards Redesign

- **Frontend**: Redesigned dashboard stat cards with coloured circular icons, big bold numbers, and labels
- **Frontend**: All 8 stat cards are now clickable — navigate to filtered list views
- **Frontend**: Stat cards locked to fixed 3×2 grid size (draggable but not resizable)
- **Frontend**: Converted 6 list widgets (recently added, unassigned, checked out, warranty/cert/licence expiries) to number-only stat cards
- **Frontend**: Updated default dashboard layout — 8 stat cards in top 2 rows, charts below
- **Frontend**: Removed per-widget expiry day selectors (hardcoded to 30 days)
- **Frontend**: Added dark mode support for stat card icon backgrounds

## 2026-02-08 20:38 - Bulk Actions for Type & People Pages

- **Backend**: Added `POST /api/v1/assettypes/bulk-archive` endpoint
- **Backend**: Added `POST /api/v1/certificatetypes/bulk-archive` endpoint
- **Backend**: Added `POST /api/v1/applicationtypes/bulk-archive` endpoint
- **Backend**: Added `POST /api/v1/people/bulk-archive` endpoint
- **Frontend**: Added `bulkArchive()` to asset-types, certificate-types, application-types, and people API clients
- **Frontend**: Added `useBulkArchive*` hooks for all four entity types
- **Frontend**: Integrated row selection + bulk archive on Asset Types, Certificate Types, Application Types, and People pages

## 2026-02-08 20:27 - Bulk Actions for List Pages

- **Backend**: Added `POST /api/v1/assets/bulk-archive` and `POST /api/v1/assets/bulk-status` endpoints
- **Backend**: Added `POST /api/v1/certificates/bulk-archive` and `POST /api/v1/certificates/bulk-status` endpoints
- **Backend**: Added `POST /api/v1/applications/bulk-archive` and `POST /api/v1/applications/bulk-status` endpoints
- **Backend**: Added `BulkArchiveRequest`, `BulkStatusRequest`, and `BulkActionResponse` DTOs
- **Backend**: Each bulk operation audits per-item and returns succeeded/failed counts
- **Frontend**: Added `bulkArchive()` and `bulkStatus()` to all three API client files
- **Frontend**: Added `useBulkArchive*` and `useBulkStatus*` hooks for all three entity types
- **Frontend**: Added row selection support to `DataTable` component (`rowSelection`, `onRowSelectionChange`, `getRowId`)
- **Frontend**: Created `data-table-selection-column.tsx` — reusable checkbox column (header select-all + row select)
- **Frontend**: Created `bulk-action-bar.tsx` — sticky bar showing selected count, action buttons, and clear selection
- **Frontend**: Integrated bulk actions on Assets page (Archive, Available, Assigned, In Maintenance)
- **Frontend**: Integrated bulk actions on Certificates page (Archive, Active, Expired, Revoked, Pending Renewal)
- **Frontend**: Integrated bulk actions on Applications page (Archive, Active, Expired, Suspended, Pending Renewal, Inactive)
- **Frontend**: Bulk archive shows confirmation dialog; status changes apply immediately
- **Frontend**: Selection clears after successful bulk operation

## 2026-02-08 16:44 - Type Filter + Grouped View for List Pages

- **Backend**: Added `typeId` query parameter to Assets, Certificates, and Applications `GetAll` endpoints
- **Frontend**: Added Type filter dropdown to all three list page filter popovers
- **Frontend**: Added `typeId` to query param interfaces and saved view configuration
- **Frontend**: Added view mode toggle (List / Grouped) to all three list pages
- **Frontend**: Created `GroupedGridView` component that groups items by type with collapsible sections
- **Frontend**: Created entity card components (`AssetCard`, `CertificateCard`, `ApplicationCard`) for grouped view
- **Frontend**: Created `ViewModeToggle` segmented control component
- **Frontend**: Extended `DataTable` to support `hideTable` + `children` for alternate views
- **Frontend**: Type filter and view mode are persisted in URL params and saved views

## 2026-02-08 15:53 - Restore Retire/Sell Asset Workflow

- **Fix**: Restored retire and sell asset dialogs, API endpoints, and hooks accidentally removed during list filter overhaul
- **Backend**: Restored `POST /assets/{id}/retire` and `POST /assets/{id}/sell` endpoints
- **Backend**: Restored `RetireAssetRequest` and `SellAssetRequest` DTOs
- **Backend**: Added `SoldDate`, `SoldPrice`, `RetiredDate` back to `AssetDto`
- **Backend**: Restored `RetiredDate` property on `Asset` model (no-op migration to sync snapshot)
- **Backend**: Restored "Retired" and "Sold" mappings in `AuditService`
- **Frontend**: Restored `RetireAssetDialog` and `SellAssetDialog` components
- **Frontend**: Restored retire/sell buttons on asset detail page (hidden for already retired/sold assets)
- **Frontend**: Restored `soldDate`, `soldPrice`, `retiredDate` display on asset detail page
- **Frontend**: Restored `useRetireAsset` and `useSellAsset` hooks + API client methods
- **Frontend**: Restored `RetireAssetRequest`, `SellAssetRequest` types + sold/retired fields on `Asset` type
- **DB migration**: `RestoreRetiredDateToSnapshot` (no-op — column already existed)

## 2026-02-08 15:29 - List Filter Overhaul + Application Inactive Status

- **Backend**: Added `Inactive` value to `ApplicationStatus` enum (DB migration `AddApplicationInactiveStatus`)
- **Backend**: New `includeStatuses` query param on all three list endpoints (`/assets`, `/applications`, `/certificates`)
- **Backend**: Assets default list now excludes `Retired` and `Sold` statuses; `includeStatuses=Retired,Sold` opts them back in
- **Backend**: Applications default list now excludes `Inactive` status; `includeStatuses=Inactive` opts it back in
- **Backend**: Certificates endpoint accepts `includeStatuses` for API consistency (no hidden statuses currently)
- **Frontend**: Replaced status `<Select>` dropdown on all three list toolbars with `<Popover>` containing status filter + include checkboxes
- **Frontend**: Assets toolbar: checkboxes for "Include retired" and "Include sold"
- **Frontend**: Applications toolbar: checkbox for "Include inactive"
- **Frontend**: Certificates toolbar: popover with status filter only (no hidden statuses)
- **Frontend**: Filter state persists in URL params (`includeRetired`, `includeSold`, `includeInactive`)
- **Frontend**: Filter button shows badge count when filters are active
- **Frontend**: Added `Inactive` status badge styling for applications (slate theme)
- **Frontend**: Added `Inactive` to application form status dropdown

## 2026-02-08 14:21 - Mark MVP Complete

- **Chore**: Mark "DataTable: saved views per user" as complete in todo.md — all Next (MVP) items are now done

## 2026-02-08 14:08 - Default View + Column Visibility Fix

- **Fix**: Assets page no longer hides standard columns (Type, Assigned To) on initial load — replaced dual-useEffect initialization with simpler pattern that merges custom field visibility as defs load
- **UX**: Added synthetic "Default" view entry at top of Views dropdown on all 9 list pages — always visible, resets columns/sort/filters to page defaults
- **UX**: "Update current view" option hidden when on Default view; trigger button shows "Default" instead of "Views" when no custom view is active

## 2026-02-08 13:47 - Saved Views

- **Backend**: New `SavedView` model with `SavedViews` table (DB migration `AddSavedViews`)
- **Backend**: New `SavedViewsController` — CRUD endpoints at `/api/v1/saved-views` (scoped per user + entity type)
- **Backend**: Endpoints: GET (list by entityType), POST (create), PUT (update), DELETE, PUT `/{id}/default` (toggle default)
- **Frontend**: New `SavedViewSelector` component — dropdown to apply, save, rename, delete, and set default views
- **Frontend**: New API layer, types, and React Query hooks for saved views
- **Frontend**: `DataTable` now supports external `columnVisibility` / `onColumnVisibilityChange` props
- **Frontend**: All 9 list pages integrated (assets, certificates, applications, locations, people, asset-types, certificate-types, application-types, audit-log)
- **Frontend**: Default saved view auto-applies on page load; views capture column visibility, sort, filters, and page size

## 2026-02-07 22:32 - User Authentication (JWT)

- **Backend**: Added JWT Bearer authentication with BCrypt password hashing
- **Backend**: New `AuthController` — `POST /api/v1/auth/login` (returns JWT + user profile), `GET /api/v1/auth/me`
- **Backend**: New services — `ITokenService`/`TokenService`, `ICurrentUserService`/`CurrentUserService`
- **Backend**: All controllers (except Health) now require `[Authorize]` attribute
- **Backend**: Audit logging now captures `ActorId` and `ActorName` from JWT claims (was always "System")
- **Backend**: Admin user seeded on startup (`admin`/`admin123`) with "Admin" role
- **Backend**: JWT config in `appsettings.json` (Key, Issuer, Audience, ExpiryHours)
- **Frontend**: Login page with zod-validated form, centered card layout
- **Frontend**: `AuthProvider` context — manages token, user profile, login/logout
- **Frontend**: `ProtectedRoute` wrapper — redirects to `/login` if unauthenticated
- **Frontend**: API client sends `Authorization: Bearer` header; auto-redirects to `/login` on 401
- **Frontend**: User menu in header — shows initials, display name, email, logout option
- **Default dev credentials**: `admin` / `admin123`

## 2026-02-07 22:06 - Applications/Licences Module (full stack)

- **Backend**: New models — `ApplicationType`, `Application`, `ApplicationHistory`, `ApplicationHistoryChange`
- **Backend**: New enums — `ApplicationStatus` (Active, Expired, Suspended, PendingRenewal), `ApplicationHistoryEventType`, `LicenceType` (PerSeat, Site, Volume, OpenSource, Trial, Freeware, Subscription, Perpetual)
- **Backend**: Extended `CustomFieldDefinition` with `ApplicationTypeId` for application-type-scoped custom fields
- **Backend**: New `ApplicationTypesController` — full CRUD with paging, sorting, search, custom field definitions
- **Backend**: New `ApplicationsController` — full CRUD with paging, sorting, search, status filter, custom field values, change-tracked history
- **Backend**: `AuditService` extended to create `ApplicationHistory` records on Application entity changes
- **Backend**: Dashboard endpoints — `GET /api/v1/dashboard/licence-expiries?days=30`, `GET /api/v1/dashboard/application-summary`
- **Backend**: DB migration `AddApplicationsModule` applied
- **Frontend**: Application Types page — full CRUD with custom field editor, paging, sorting, search
- **Frontend**: Applications page — full CRUD with paging, sorting, search, status filter, form with licence fields and custom fields
- **Frontend**: Application detail page — info card, custom fields display, history timeline, edit dialog
- **Frontend**: Licence Expiries dashboard widget with configurable timeframe
- **Frontend**: Routes added: `/application-types`, `/applications/:id`
- **Frontend**: Sidebar nav: added Application Types item

## 2026-02-07 21:25 - Certificates Module (full stack)

- **Backend**: New models — `CertificateType`, `Certificate`, `CertificateHistory`, `CertificateHistoryChange`
- **Backend**: New enums — `CertificateStatus` (Active, Expired, Revoked, PendingRenewal), `CertificateHistoryEventType`
- **Backend**: Extended `CustomFieldDefinition` with `CertificateTypeId` for certificate-type-scoped custom fields
- **Backend**: New `CertificateTypesController` — full CRUD with paging, sorting, search, custom field definitions
- **Backend**: New `CertificatesController` — full CRUD with paging, sorting, search, status filter, custom field values, change-tracked history
- **Backend**: `AuditService` extended to create `CertificateHistory` records on Certificate entity changes
- **Backend**: Dashboard endpoints — `GET /api/v1/dashboard/certificate-expiries?days=30`, `GET /api/v1/dashboard/certificate-summary`
- **Backend**: DB migration `AddCertificatesModule` applied
- **Frontend**: Certificate Types page — full CRUD with custom field editor, paging, sorting, search
- **Frontend**: Certificates page — full CRUD with paging, sorting, search, status filter, form with custom fields
- **Frontend**: Certificate detail page — info card, custom fields display, history timeline, edit dialog
- **Frontend**: Certificate Expiries dashboard widget with configurable timeframe
- **Frontend**: Routes added: `/certificate-types`, `/certificates/:id`
- **Frontend**: Sidebar nav: added Certificate Types item

## 2026-02-07 20:01 - Server-side pagination for Locations, Asset Types, People & Audit Logs

- **Backend**: `GET /api/v1/locations` now accepts `page`, `pageSize`, `search`, `sortBy`, `sortDir` query params; returns `PagedResponse<LocationDto>`
- **Backend**: `GET /api/v1/assettypes` now accepts `page`, `pageSize`, `search`, `sortBy`, `sortDir` query params; returns `PagedResponse<AssetTypeDto>`
- **Backend**: `GET /api/v1/people` now accepts `page`, `pageSize`, `search`, `sortBy`, `sortDir` query params; returns `PagedResponse<PersonDto>`. Search filters on fullName + email
- **Backend**: `GET /api/v1/auditlogs` now accepts `page`, `pageSize`, `search`, `entityType`, `action`, `sortBy`, `sortDir` query params; returns `PagedResponse<AuditLogDto>`. Removed `limit` param. Upgraded search to case-insensitive ILike
- **Frontend**: All four list pages now use URL-driven state (page/pageSize/search/sort), debounced search, `<DataTablePagination>`, column toggle, and server-side sorting
- **Frontend**: `getAll()` wrappers updated to use `pageSize=1000` so form dropdowns (locations, asset types in asset form) continue to work unchanged
- **Frontend**: New hooks: `usePagedLocations()`, `usePagedAssetTypes()`, `usePagedPeople()`, `usePagedAuditLogs()` — all with `keepPreviousData`

## 2026-02-07 19:38 - Server-side pagination, sorting & filtering for Assets

- **Backend**: New `PagedResponse<T>` generic DTO for paged API responses
- **Backend**: `GET /api/v1/assets` now accepts `page`, `pageSize`, `search`, `status`, `sortBy`, `sortDir` query params
- **Backend**: Search filters on name and asset tag (case-insensitive), status filters by enum value
- **Backend**: Supports sorting by name, assetTag, status, assetTypeName, locationName, purchaseDate, purchaseCost, warrantyExpiryDate, createdAt
- **Frontend**: `apiClient.get()` now accepts optional `params` arg for query string building
- **Frontend**: New `PagedResponse<T>` TypeScript type, new `AssetQueryParams` interface
- **Frontend**: New `usePagedAssets()` hook with `keepPreviousData` for smooth page transitions
- **Frontend**: New reusable `<DataTablePagination>` component (page nav, rows-per-page selector, total count)
- **Frontend**: `<DataTable>` now supports optional server-side mode via `manualPagination`, `manualSorting`, `paginationControls` props
- **Frontend**: `<AssetsToolbar>` switched from column-filter-based to callback-based search/status filtering
- **Frontend**: Assets page orchestrates all state via URL search params (bookmarkable, back-button friendly)
- **Frontend**: Debounced search input (300ms) prevents excessive API calls
- No DB migrations. Locations, AssetTypes, and Dashboard pages unaffected.

## 2026-02-07 19:12 - Column visibility toggle for DataTable

- **Frontend**: New reusable `<ColumnToggle>` component — dropdown with checkboxes to show/hide columns
- **Frontend**: Added to assets toolbar; custom field columns (hidden by default) can now be toggled visible
- **Frontend**: Actions column marked as non-hideable

## 2026-02-07 18:41 - Custom Fields (define per asset type, render in forms, DataTable columns)

- **Backend**: New DTOs (`CustomFieldDto.cs`), endpoints for custom field CRUD
- **Backend**: `GET /api/v1/assettypes` and `GET /api/v1/assettypes/{id}` now return `customFields` array
- **Backend**: `GET /api/v1/assettypes/{id}/customfields` returns active definitions ordered by sortOrder
- **Backend**: Create/update asset type reconciles custom field definitions (add/update/archive)
- **Backend**: Create/update asset accepts `customFieldValues` array, validates against asset type definitions
- **Backend**: Audit log tracks custom field value changes (prefixed `Custom:`)
- **Frontend**: Custom field editor in Asset Type create/edit dialog (add/remove/reorder fields, set type/options/required)
- **Frontend**: Dynamic custom fields section in Asset form (renders Text, Number, Date, Boolean, SingleSelect, MultiSelect, URL inputs based on definitions)
- **Frontend**: Custom field columns in Assets DataTable (hidden by default, toggleable via column visibility)
- **DB Migration**: `ConfigureCustomFieldValueEntityFK` — maps `Asset.CustomFieldValues` via `EntityId` FK, drops shadow `AssetId` column
- Supported field types: Text, Number, Date, Boolean, SingleSelect, MultiSelect, URL

## 2026-02-07 17:49 - Replace @dnd-kit with react-grid-layout for free-form dashboard grid

- **Frontend**: Replaced @dnd-kit (list-based reordering) with react-grid-layout v2 (true free-form grid)
- Widgets now have explicit `{x, y, w, h}` positions on a 12-column grid
- Drag widgets to any open cell; other widgets reflow with vertical compaction
- Resize widgets by dragging edges/corners (per-widget minimum sizes enforced)
- Responsive breakpoints: lg (12 cols), md (6 cols), sm (1 col)
- Layout persists to localStorage across sessions
- All widget components updated with flex sizing to fill their grid cells
- Removed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities dependencies
- Deleted sortable-widget.tsx, replaced with dashboard-widget.tsx wrapper
- Total Assets and Total Value are now independent widgets (can be resized separately)
- Warranty Expiries settings icon aligned inline with drag handle
- Bar charts now use a 10-colour palette instead of monochrome black/primary bars

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
