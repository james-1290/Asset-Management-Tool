# Changelog

## 2026-02-21 18:10 — Dashboard settings tab redesign

- Redesigned Dashboard settings tab to match new card-based design style
- Styled widget toggles in muted background rows with hover states
- Added LayoutDashboard icon header, border-separated footer with Reset/Preview/Save actions

## 2026-02-21 17:54 — Alerts tab redesign

- Redesigned Alerts settings tab with 3-column layout: config (2/3) + sidebar (1/3)
- Expiry & Schedule card: toggle switches in row, thresholds + frequency + time inputs
- Email (SMTP) and Slack Integration cards side by side with uppercase field labels
- Alert History table with coloured type badges (Warranty/Certificate/Licence)
- Sidebar: Summary card, Manual Operations card (Send Alerts Now, Preview Daily Report)
- Removed max-w-4xl constraint on alerts tab for wider layout

## 2026-02-21 17:44 — Settings page redesign

- Redesigned Settings page with underline-style tab navigation matching mockup
- Redesigned Profile tab: side-by-side Display Name + Email fields, clickable theme picker cards (System/Light/Dark) with icons, styled card sections
- Security & Password section: password fields with show/hide eye toggle, styled card layout
- Added disabled Two-Factor Authentication card placeholder
- Merged password-form.tsx into profile-tab.tsx (password-form.tsx now orphaned)

## 2026-02-21 17:35 — Fix import page Entity Type spacing

- Added explicit mb-3 margin between "Entity Type" label and Select dropdown for visible separation

## 2026-02-21 17:24 — Import page redesign

- Redesigned Import Data page with multi-step wizard: step progress indicator, icon sections, drag-and-drop upload zone with file requirements bar, styled validation results table, and footer action bar
- All import functionality preserved: entity type selection, template download, CSV upload, validation preview, and import execution

## 2026-02-21 17:16 — Reports page redesign

- Redesigned Reports page with "Reports Central" header, icon-based tab navigation cards, stat cards with icons, and styled table sections matching the rest of the app
- All 6 report types updated: Asset Summary, Upcoming Expiries, Licence Summary, Assignments, Lifecycle, Depreciation
- Consistent card styling with `bg-card rounded-xl border` pattern, uppercase tracking-wider table headers, and status dot indicators

## 2026-02-21 16:35 — Fix Expiring Soon dashboard link

- Dashboard "Expiring Soon" card now dynamically links to the correct list page (certificates, applications, or assets) based on which entity type has the most expiring items, filtered to the next 30 days

## 2026-02-21 16:06 — Person detail page redesign

- Redesigned person detail page: large avatar with initials, breadcrumbs, Active/Archived badge, 4-col details grid with uppercase labels, tabbed section for Assets/Certificates/Applications/History

## 2026-02-21 12:50 — Location detail page redesign

- Redesigned location detail page to match other detail pages: icon header with breadcrumbs, uppercase label grid, styled card sections with count badges

## 2026-02-21 12:47 — Asset + Certificate detail page redesign

- Redesigned asset and certificate detail pages to match application detail mockup
- Consistent layout: icon header with breadcrumbs, 2-col details grid with uppercase labels, history timeline in right column
- Expiry dates color-coded (red=expired, orange=expiring soon), auto renewal with check icon
- All action buttons (Check Out, Retire, Sold, Clone, Edit Details) in header row

## 2026-02-21 12:44 — Dashboard fix + Application detail redesign

- Fixed dashboard summary/status breakdown queries to exclude Retired and Sold assets (matches assets page default)
- Redesigned application detail page: icon header with breadcrumbs, 2-col details grid with uppercase labels, seat usage bar, expiry date color coding, auto renewal check icon, history timeline in right column

## 2026-02-21 11:48 — Applications Page Redesign

- Added 4 stat summary cards at top of applications page (Total, Active, Pending Renewal, Expired) using existing dashboard API
- Application Name column now shows colored icon (hashed per app name) + bold name + licence key subtitle
- Expiry Date column now color-coded: red for expired, orange for expiring within 30 days
- Page title updated to "Applications" with new description matching mockup

## 2026-02-21 11:18 — Reassign & Delete Location

- Enhanced DELETE `/locations/{id}` 409 response to include `counts` object (assets, people, certificates, applications)
- Added `GET /locations/{id}/certificates` endpoint
- Added `GET /locations/{id}/applications` endpoint
- Added `POST /locations/{id}/reassign-and-archive` endpoint — atomically moves all items to target location and archives source
- New `ReassignLocationDialog` component — shows item counts by type, location picker, destructive confirm button
- Locations list page: delete on location with items now shows reassign modal instead of error toast
- Location detail page: same reassign flow when archiving location with items

## 2026-02-20 23:28 — UI Redesign: Mockup Alignment

- Moved dashboard widget settings from floating gear icon to dedicated Settings > Dashboard tab with live preview dialog
- Updated light theme colour palette from warm greys to Tailwind slate (cooler, blue-tinged)
- Moved table pagination inside the white card container (was on grey background)
- Table headers now bold uppercase dark text across all pages (assets, certificates, applications, types)
- Sortable column headers (Asset Name, Financials, Name, Type, etc.) now match static header styling
- Filter chips (Type, Status): white background, consistent dark foreground text
- More Filters button: plain text with icon, no background
- More Filters dropdown: replaced FilterChip with native selects for Location/Assigned To, widened panel
- Removed ActiveFilterChips row beneath toolbar buttons
- Deleted unused `widget-settings-popover.tsx`
- Fixed pre-existing build errors: unused `end` variable, missing `expiringItems` in `WIDGET_MIN_SIZES`

## 2026-02-20 21:09 — UI Redesign: Match Mockup Design Language

- **Color scheme**: Primary changed from `#3B82F6` (blue) to `#2918dc` (deep indigo); dark mode primary to `#6366F1`
- **Background**: Updated to `#f6f6f8` for a warmer feel; accent colors now primary-tinted
- **Sidebar**: Added section labels ("MAIN", "MANAGEMENT"), active state with left border accent + primary tint, bumped icons to `h-5 w-5`, added subtitle under logo, height to `h-16`
- **Header**: Height `h-12` → `h-16`, padding `px-4` → `px-8`, added user name/role next to avatar, divider between controls and profile
- **Page headers**: Title `text-lg` → `text-3xl font-bold`, added breadcrumb navigation above title on all list pages
- **Stat cards**: Redesigned with colored icon backgrounds (top-left), trend indicator support, `p-6` padding, `rounded-xl`, shadow-sm baseline, "attention" variant now uses `border-l-4 border-l-red-500`
- **Tables**: Header `px-2` → `px-6 py-4` with uppercase tracking-wider; cells `p-2` → `px-6 py-4`; hover `bg-slate-50/50`; container `rounded-xl`; header row bg-tinted
- **Status badges**: `px-1.5 py-0.5 text-[10px]` → `px-2.5 py-1 text-xs font-medium`; updated to `bg-*-50 text-*-700` color scheme
- **Pagination**: Added "Showing X to Y of Z results" text, Previous/Next text buttons with outlines
- **Dashboard**: Each stat card gets unique colored icon background; status breakdown chart has center total label + percentage legend; activity feed shows avatars with action dots
- **Content area**: Main padding `p-6` → `p-8`
- All existing functionality preserved (CRUD, filters, sorting, pagination, bulk actions, dark mode, sidebar collapse)

## 2026-02-20 20:11 — Asset Creation Fix + Pagination UI Tweak

- Fixed 500 error when creating/updating assets: Jackson couldn't deserialize plain date strings ("2026-02-20") into `Instant` fields — added `FlexibleInstantDeserializer` to accept both plain dates and full ISO-8601 instants
- Made `serialNumber`, `locationId`, `purchaseDate`, `warrantyExpiryDate` nullable in Create/Update Asset DTOs — frontend doesn't always send these fields
- Relaxed validation: serial number and location no longer required on create/update
- Fixed pagination rows-per-page dropdown width too narrow (60px → 70px), "25" was getting clipped

## 2026-02-15 21:13 — Dashboard Widget Link Fixes + Sidebar Border Alignment

- Fixed sidebar header border not aligning with main header border (h-14 → h-12)
- Fixed "Unassigned" widget linking to all Available assets instead of only unassigned ones (added `&unassigned=true`)
- Fixed "Recently Added" widget showing arbitrary count (was top-N limit, now counts assets created in last 7 days)
- Added `createdAfter` filter support to assets API and list page
- Dashboard recently-added endpoint now excludes Retired/Sold assets to match list page defaults
- "Added since" filter chip shown on assets page when navigating from dashboard

## 2026-02-15 20:41 — ESLint Bug Fix Sweep

- Removed unused imports: `Badge` (notifications-bell), `endOfYear` (date-range-picker), Dialog components (person-detail), unused eslint-disable (custom-fields-section)
- Fixed setState-in-effect: `recentSearches` now derived via `useMemo` (command-search), `isLoading` uses lazy initializer (auth-context), offboard-dialog suppressed with justification
- Fixed "cannot access before declared" + missing `useEffect` deps: converted `applyView` to `useCallback` and moved before useEffect in all 9 list/type pages (assets, certificates, applications, people, locations, audit-log, asset-types, certificate-types, application-types)
- Suppressed `react-refresh/only-export-components` in shadcn UI files (badge, button, form, sidebar, tabs) and asset columns
- Suppressed `react-hooks/purity` for shadcn sidebar skeleton `Math.random`
- Suppressed `react-refresh/only-export-components` for `useAuth` in auth-context
- Result: 0 ESLint errors, only 6 `incompatible-library` warnings remaining (React Hook Form / TanStack Table)

## 2026-02-15 20:21 — Attachment Preview Pane

- Inline preview for images (PNG, JPG, GIF) and PDFs via Eye icon button
- Uses blob + object URL pattern to handle auth headers for `<img>`/`<iframe>` src
- Non-previewable files (DOCX, XLSX, etc.) show download only — no eye icon
- Object URLs cleaned up on dialog close to prevent memory leaks

## 2026-02-15 14:24 — File Attachment Support

### Backend
- **V009 migration**: `attachments` table with polymorphic `entity_type` + `entity_id`
- **StorageService interface** + `LocalStorageService` (local filesystem, configurable via `app.upload-dir`)
- **AttachmentsController**: upload (multipart), list, download (streaming), soft-delete
- MIME type allowlist: PDF, images, Office docs, plain text/CSV
- Max file size increased to 10MB
- Audit logging on upload and delete events
- Path traversal protection in storage layer

### Frontend
- **AttachmentsSection** reusable component: upload button, file list with MIME icons, download, delete with confirmation
- Added to asset, certificate, and application detail pages
- React Query hooks for attachment CRUD with cache invalidation

## 2026-02-15 12:07 — Phase B: Notification Centre + User Alerts

### Backend — New Tables & Endpoints
- `user_notifications` table: per-user notification state with read/dismiss/snooze
- `user_alert_rules` table: personal alert rules per user
- `UserNotificationsController`: paginated list, unread count, mark read, dismiss, snooze (1d/3d/1w/until_expiry), mark all read
- `UserAlertRulesController`: CRUD for personal alert rules
- `AlertProcessingService` extended: creates `user_notifications` for all active users (global) and per-user (personal rules) with dedup
- `NotificationCleanupService`: daily scheduled job purges notifications older than 90 days
- Per-type Slack webhooks: warranty, certificate, licence channels with global fallback

### Frontend — Notification Centre
- Enhanced notifications bell: unread count badge, popover with read/snooze/dismiss actions per notification
- Full notification centre page (`/notifications`): Current (unread) and History (all) tabs with pagination
- Entity type badges (warranty/certificate/licence) with urgency coloring
- Click-through navigation to entity detail pages

### Frontend — Personal Alert Rules
- "My Alerts" settings tab (visible to all users): create/edit/delete personal alert rules
- Configure entity types, thresholds, email notification toggle, active/inactive status

### Frontend — Admin Settings
- Per-type Slack webhook fields: Warranties channel, Certificates channel, Licences channel + default fallback
- Sidebar "Notifications" nav item

### DB Migration
- V008: `user_notifications` + `user_alert_rules` tables with indexes and foreign keys

---

## 2026-02-15 10:26 — Phase C: Advanced Filtering + Quick Filter Chips + Saved Filters

### Backend
- Added date range, numeric range, location, person, department, unassigned, and licence type filter params to all 5 list endpoints (Assets, Certificates, Applications, People, Audit Log)
- CSV export endpoints also support all new filter params

### Frontend — Reusable Filter Components
- **DateRangeFilter**: pill-shaped chip with from/to date popover
- **NumericRangeFilter**: pill-shaped chip with min/max number popover
- **ActiveFilterChips**: removable summary chips with "Clear all" button
- **QuickFilterBar**: one-click preset filter buttons

### Frontend — Quick Filters
- **Assets**: Unassigned, Expiring Soon, High Value, In Maintenance
- **Certificates**: Expiring Soon, Expired, Pending Renewal
- **Applications**: Expiring Soon, Expired, Subscription

### Frontend — Per-Page Filters
- **Assets**: location, assigned person, purchase date range, warranty expiry range, cost range, unassigned toggle
- **Certificates**: expiry date range
- **Applications**: expiry date range, licence type, cost range
- **People**: location, department
- **Audit Log**: date range

### Saved Views
- Extended ViewConfiguration with generic `filters` map — saved views now persist all advanced filters
- Loading a saved view restores all filter state; saving captures current filters

## 2026-02-14 17:01 — Phase A: Smart Dashboard + Search + People 360 + Reports Polish

### Dashboard
- New **Inventory Snapshot** widget: spare counts per asset type, expiring this month, checked out, in maintenance — each card clickable to filtered list

### Global Search (Cmd+K)
- Rich result previews: asset type/status, department/job title, expiry countdown, asset counts shown inline
- Category counts in group headers (e.g. "Assets (12)")
- Recent searches stored in localStorage, shown when input is empty

### People
- **360 view**: summary strip with entity counts, tabbed layout (Assets, Certificates, Applications, History)
- New backend endpoints: person summary, person certificates, person applications
- **Offboarding workflow**: "Offboard / Reclaim Assets" dialog — per-item transfer to another person, mark as available, or keep — all in one batch with audit trail
- Optional person archival during offboarding

### Reports
- **Date range controls** on Expiries, Asset Lifecycle, and Licence Summary reports (presets + custom date picker)
- New **Depreciation Report** (6th tab): summary cards (total cost, accumulated depreciation, book value), grouped-by-type table, asset type/location filters, CSV export
- **Print button** with print-friendly CSS on all 6 reports
- Generation timestamps and filter summary lines on all reports
- CSV exports respect active date ranges and filters

## 2026-02-14 15:12 - Security audit: comprehensive hardening (Phases 1-3)

### Phase 1 — Security Critical
- **Startup security validator**: Warns on default JWT secret, admin password, SCIM token, and Swagger enabled at startup
- **Input validation**: Added Jakarta Bean Validation annotations (`@NotBlank`, `@Size`, `@Email`) to all auth and user DTOs, with `@Valid` on controller methods
- **Validation error handler**: Returns structured error responses with field-level details
- **Password policy**: Minimum password length increased from 6 to 8 characters
- **CSV injection fix**: Added `|` (pipe) and `` ` `` (backtick) to dangerous prefix sanitization list
- **SSO open redirect prevention**: Frontend now validates SSO URLs are relative or same-origin before redirecting
- **Swagger disabled by default**: `SWAGGER_ENABLED` now defaults to `false` (set to `true` via env var for local dev)
- **Login audit logging**: All login attempts (success and failure) now written to audit log with details

### Phase 2 — Security Hardening
- **Security headers**: Added `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` to both SAML and API filter chains
- **JWT filter logging**: Invalid JWT tokens now logged at WARN level with SecurityContext cleared explicitly
- **Error correlation IDs**: Generic 500 errors now include a UUID `errorId` for log correlation
- **Database indexes**: Added missing indexes on `audit_logs.actor_id`, `custom_field_values.entity_id`, and `user_roles.user_id` (V007 migration)

### Phase 3 — Code Quality
- **Standardized authorization**: Replaced manual `isAdmin()` checks in SettingsController with declarative `@PreAuthorize("hasRole('Admin')")` annotations
- **Import page visibility**: Sidebar now hides "Import Data" link from non-admin users

### DB Migration
- V007: `add_foreign_key_indexes` — adds 3 new performance indexes

## 2026-02-14 14:34 - Security hardening round 2c (SAML account takeover + import auth)

- **SAML account takeover prevention**: Email-based auto-linking now only applies to users with `authProvider` of `SAML` or `SCIM` — local users are never silently linked to an SSO identity, preventing account takeover via a malicious IdP
- **Import controller authorization**: `ImportController` now requires Admin role via `@PreAuthorize("hasRole('Admin')")` — previously any authenticated user could bulk-import data
- No DB migrations

## 2026-02-14 14:23 - Security hardening round 2b (follow-up fixes)

- **SAML isActive check**: SAML auth handler now rejects deactivated users before issuing JWT — redirects to `/login?error=account_disabled`
- **Audit logs authorization**: `AuditLogsController` now requires Admin role via `@PreAuthorize("hasRole('Admin')")` — previously accessible to any authenticated user
- No DB migrations

## 2026-02-14 14:00 - Security hardening round 2 (Entra-only auth strategy)

- **JWT isActive check**: JWT filter now verifies user exists and is active in DB on every authenticated request — deactivated user tokens are immediately rejected
- **CSV formula injection**: All 7 CSV export endpoints sanitize cell values — strings starting with `=`, `+`, `-`, `@`, `\t`, `\r` are prefixed with `'` to prevent spreadsheet formula injection
- **Local login gating**: `POST /api/v1/auth/login` can be disabled via `LOCAL_LOGIN_ENABLED=false` env var (returns 404); admin user seeding also skipped when disabled
- **SCIM constant-time comparison**: Bearer token validation uses `MessageDigest.isEqual()` instead of `!=` to prevent timing attacks
- **HTTP security headers**: Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (1 year, includeSubDomains) to both API and SAML filter chains
- **CORS explicit headers**: Replaced wildcard `allowedHeaders: *` with explicit `Content-Type, Authorization, X-Requested-With`
- **Swagger production toggle**: Swagger UI and API docs can be disabled via `SWAGGER_ENABLED=false` env var
- **Docker localhost binding**: All container ports (MySQL 3306, PostgreSQL 5432, MailHog 1025/8025) now bind to `127.0.0.1` only — not exposed on network interfaces
- **Global exception handler**: Unhandled exceptions return generic `{"error": "An internal error occurred"}` — no stack traces leaked to clients
- No DB migrations

## 2026-02-14 13:27 - Security hardening (env-var overrides for production)

- **JWT key**: Now configurable via `JWT_KEY` env var (dev default preserved)
- **DB credentials**: Configurable via `DB_USERNAME`/`DB_PASSWORD` env vars (dev defaults `root/root` preserved)
- **Admin password**: Configurable via `ADMIN_PASSWORD` env var (dev default `admin123` preserved)
- **SCIM endpoint locked down**: `/scim/v2/**` no longer uses `permitAll()` when `scim.enabled=false` (default) — unauthenticated requests now get 403 instead of passing through
- **SCIM bearer token**: Configurable via `SCIM_BEARER_TOKEN` env var (already was, unchanged)
- **Secrets masked in API**: `GET /api/v1/settings/alerts` now returns `********` for `smtpPassword` and `graphClientSecret`, truncates `slackWebhookUrl`; PUT endpoint skips masked values to preserve existing secrets
- **Users listing requires Admin role**: `GET /api/v1/users` now has `@PreAuthorize("hasRole('Admin')")` matching all other user endpoints
- **`@EnableMethodSecurity` added**: `@PreAuthorize` annotations on controllers are now actually enforced (was missing, annotations were silently ignored)
- **Frontend**: Alerts settings form clears masked password values, shows "Leave blank to keep current" placeholder
- No DB migrations

## 2026-02-13 21:55 - Asset templates + asset cloning

- **New entity: Asset Templates** — saved presets per asset type with default values for cost, depreciation, location, notes, and custom fields
- **Backend**: Full CRUD at `POST/GET/PUT/DELETE /api/v1/asset-templates` with optional `?assetTypeId=` filter, custom field value support, and audit logging
- **DB migration**: V006 — `asset_templates` table; custom field values reuse existing `custom_field_values` table
- **Frontend**: Templates list page at `/asset-templates` with asset type filter, form dialog with custom fields support
- **Template picker**: When creating a new asset, selecting an asset type shows a "Template" dropdown to pre-fill form fields (only fills empty fields)
- **Asset cloning**: Clone button on asset detail page opens create form pre-filled from the source asset (type, location, cost, depreciation, notes, custom fields retained; name, serial number, assigned person cleared; status set to Available)
- **Navigation**: Added "Asset Templates" under Inventory group in sidebar

## 2026-02-13 21:17 - Bulk edit for assets

- **Backend**: New `POST /api/v1/assets/bulk-edit` endpoint — accepts optional fields (status, location, assigned person, notes) and applies only the provided fields to selected assets
- **Audit trail**: Full field-level change tracking per asset; person assignment/unassignment logged to person history
- **Frontend**: BulkEditDialog with checkbox-gated fields — only checked fields are sent in the request
- **UI**: "Edit" button added to bulk action bar alongside existing Archive and status buttons
- Fixed AuditService to map "BulkEdited" and "StatusChanged" actions to asset history

## 2026-02-13 21:00 - Update todo.md backlog

- Removed "Relationship linking" (deemed low-value for actual workflow)
- Added three new features to Later: Bulk edit, Asset cloning, Asset kits/bundles

## 2026-02-13 20:36 - Prevent deleting types that are in use

- **Asset types**: Cannot delete an asset type if active (non-archived) assets reference it. Returns 409 with descriptive error message.
- **Certificate types**: Same protection — cannot delete if certificates reference the type.
- **Application types**: Same protection — cannot delete if applications reference the type.
- **Bulk archive**: Skips types that are in use (counts as failed in the response).
- **Frontend**: Error toasts now surface the server's specific error message (e.g. "Cannot delete 'Laptop' because it is used by 11 asset(s)").

## 2026-02-13 19:45 - Global design consistency across all pages

- **Borderless tables**: All DataTable pages (certificates, applications, types, locations, people, audit log) now use `variant="borderless"` matching the assets page aesthetic
- **Count badges**: All list pages now show a total count badge in the PageHeader actions area
- **PageHeader consistency**: Reports, Settings, and Import pages now use the shared `PageHeader` component instead of manual `h1/p` elements
- **FilterChip inline filters**: Certificates, Applications, and Audit Log toolbars converted from popover-based filters to inline `FilterChip` components
- **Standardized search width**: All toolbar search inputs now use `max-w-[240px]`
- **Compound name cells**: Certificates (ShieldCheck icon + serial number), Applications (AppWindow icon + licence key), People (AvatarPlaceholder + email), Locations (MapPin icon + city) now have rich compound name cells with icons and subtitles
- **Assigned To columns**: Certificates and Applications tables now show an AvatarPlaceholder for the assigned person
- **Type table simplification**: Asset Types, Certificate Types, and Application Types now show name + description in a single compound cell (description as subtitle)

## 2026-02-13 13:41 - Remove asset tag, add naming templates, enforce required fields

- **Removed asset tag** from entire stack (~43 files). Asset tag column made nullable in DB, removed from all forms, columns, search, CSV import/export, dashboard widgets, and reports. Name is now the primary identifier.
- **Naming templates per asset type**: Asset types can define a `nameTemplate` (e.g., `COAD-%SERIALNUMBER%`) that auto-generates asset names during creation. Supports `%SERIALNUMBER%` and `%ASSETTYPENAME%` variables. Users can override the generated name.
- **Required field enforcement**: Serial number, location, and purchase date are now mandatory on both frontend (zod validation) and backend (controller validation with 400 responses).
- **Auto-fill depreciation**: When creating an asset, selecting an asset type with a default depreciation period auto-fills the depreciation months field.
- DB migration V005: `asset_tag` nullable + dropped unique index, `name_template` added to `asset_types`

## 2026-02-13 12:31 - Fix depreciation without purchase date

- Depreciation fields (monthly, total, book value) now compute even without a purchase date
- Without purchase date: monthly depreciation shown, total depreciation = £0, book value = full cost
- Fix applies to both API responses and CSV export

## 2026-02-12 17:37 - Add depreciation tracking

- Straight-line depreciation computed on-the-fly: `bookValue`, `totalDepreciation`, `monthlyDepreciation`
- Asset types now have `defaultDepreciationMonths` — auto-fills on asset creation
- `depreciationMonths` wired through asset create/update forms
- Asset detail page shows depreciation section when depreciation is configured
- Dashboard "Total Book Value" stat card shows sum of book values across all assets
- CSV export includes DepreciationMonths, BookValue, TotalDepreciation columns
- DB migration V004: adds `default_depreciation_months` to `asset_types`

## 2026-02-12 12:04 - Add Slack webhook alerts

- New `SlackService` sends Block Kit formatted digest messages to a Slack webhook
- Alert processing now supports Slack-only, email-only, or both channels simultaneously
- `POST /api/v1/alerts/test-slack` endpoint to verify webhook configuration
- Frontend: "Send Test Slack" button in Settings > Alerts > Actions card
- No DB migration needed — `alerts.slack.webhookUrl` setting already exists

## 2026-02-12 10:46 - Grey out Entra-managed fields for SSO/SCIM users

- Admin edit dialog: display name, email, and active toggle disabled for SSO users; role remains editable
- Admin user list: "Reset Password" action hidden for non-LOCAL users
- Profile page: name/email inputs disabled, password form hidden for SSO users
- Added `authProvider` to `UserDetail` TypeScript type

## 2026-02-12 09:50 - Add SAML 2.0 SSO and SCIM 2.0 provisioning

- **SAML 2.0 SSO** (Microsoft Entra ID): SP-initiated login with JIT user provisioning
  - Configurable via `saml.enabled` env var (disabled by default, existing local auth unaffected)
  - `SamlConfig` registers relying party from Entra federation metadata URL
  - `SamlAuthSuccessHandler` extracts SAML attributes, finds/creates user, issues JWT, redirects to frontend
  - Dual `SecurityFilterChain` — Order 1 for SAML paths, Order 2 for API/JWT (existing)
  - `GET /api/v1/auth/sso-config` public endpoint returns SSO state for frontend
  - Dev key generation script at `scripts/generate-saml-keys.sh`
- **SCIM 2.0 provisioning server** for automated user lifecycle from Entra
  - Configurable via `scim.enabled` env var (disabled by default)
  - Bearer token auth via `ScimAuthFilter`
  - Full SCIM endpoints: ServiceProviderConfig, Schemas, ResourceTypes, Users CRUD
  - Supports filter (`userName eq`, `externalId eq`), PATCH (Entra deactivation flow), DELETE (soft deactivate)
- **Auth guards**: local login rejects SSO accounts, password reset blocked for non-LOCAL users, Entra-synced fields (displayName, email, active) are read-only for SSO/SCIM users (only role is editable by admins)
- **DB migration V003**: adds `auth_provider`, `external_id` columns to users; makes `password_hash` nullable
- **Frontend**: login page shows "Sign in with Microsoft" button when SSO enabled, handles SSO token callback
- Added `authProvider` field to user detail and profile DTOs
- Vite proxy updated for `/saml2`, `/login/saml2`, `/scim` paths
- Added Shibboleth Maven repo for OpenSAML dependencies

## 2026-02-12 08:10 - Add duplicate detection on entity creation

- Added `POST /api/v1/{entity}/check-duplicates` endpoints for all 5 entity types (assets, certificates, applications, people, locations)
- Matching strategy: exact match on unique identifiers (assetTag, thumbprint, licenceKey, email), fuzzy (case-insensitive contains) on names and other fields
- Excludes archived records; supports `excludeId` for edit flows; returns max 5 matches
- New shared `DuplicateWarningDialog` component shows potential duplicates with links to existing records
- Create flows in both quick-actions dropdown and list pages now check for duplicates before saving
- Users can review matches and choose "Create Anyway" or "Cancel" to navigate to an existing record
- No DB migrations required

## 2026-02-11 20:49 - Add Microsoft Graph email provider

- Added selectable email provider: SMTP (existing) or Microsoft Graph (new)
- Graph provider uses `com.microsoft.graph` SDK + `com.azure:azure-identity` for client credentials flow
- EmailService refactored with provider pattern — delegates to SMTP or Graph based on `alerts.email.provider` setting
- New settings: `emailProvider`, `graphTenantId`, `graphClientId`, `graphClientSecret`, `graphFromAddress`
- Frontend: provider selector in Alerts tab, conditionally shows SMTP or Graph config fields
- SMTP path unchanged — MailHog still works for local dev

## 2026-02-11 20:19 - Email alerts for expiring items

- Added email sending engine with configurable SMTP (reads config from DB, not Spring auto-config)
- Added `AlertProcessingService`: queries expiring warranties/certificates/licences per threshold, builds grouped HTML digest email, deduplicates via `alert_history` table
- Added `AlertSchedulerService`: dynamic cron scheduling (daily/weekly/biweekly/monthly/first-business-day)
- Added Flyway migration V002 for `alert_history` table
- New endpoints: `POST /api/v1/alerts/send-now`, `POST /api/v1/alerts/test-email`, `GET /api/v1/alerts/history`
- Extended `PUT /api/v1/settings/alerts` with `scheduleType`, `scheduleTime`, `scheduleDay` fields
- Frontend: schedule configuration card, send test email dialog, send alerts now button, alert history table with pagination
- Added MailHog to docker-compose for local email testing (SMTP 1025, UI 8025)
- **DB migration**: V002__alert_history.sql

## 2026-02-11 20:02 - Remove stale postgres MCP server

- Removed `postgres` MCP server from `.mcp.json` (project migrated to MySQL)

## 2026-02-11 18:42 - Fix API port to match frontend proxy

- Changed Kotlin API port from 5116 to 5115 in `application.yml`
- Port 5115 matches the Vite proxy config (`/api` → `http://localhost:5115`)
- Verified full frontend integration: login, dashboard, all CRUD pages, audit log, settings

## 2026-02-11 18:30 - Backend Migration: ASP.NET Core → Spring Boot Kotlin

- **Full backend rewrite** from ASP.NET Core (.NET 10) + PostgreSQL to Spring Boot 3.2 Kotlin + MySQL 8.3
- New API at `apps/api-kt/` — all 21 controllers ported (6,400+ LOC Kotlin)
- All API contracts preserved: same URLs, request/response shapes, status codes
- Flyway migration (`V001__initial_schema.sql`) creates all 33 tables
- JWT auth, audit logging, CSV import/export, custom fields all functional
- Database seeder: Admin/User roles, admin user, 15 default system settings
- Stack: JDK 21, Spring Boot 3.2.5, Hibernate 6.4, Flyway 9.22, jjwt, OpenCSV, SpringDoc OpenAPI
- Docker: MySQL 8.3 service added to `infra/docker-compose.yml`
- Verified end-to-end: login, CRUD, checkout/checkin workflows, audit trail, search, reports, dashboard
- **DB migration**: PostgreSQL → MySQL (CHAR(36) UUIDs, VARCHAR(50) enums, DATETIME(6) timestamps)
- Frontend unchanged — works against new API with no modifications needed

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
