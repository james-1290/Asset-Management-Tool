# Asset Management Tool (Local-first, Azure-ready)

## API Server Management

After ANY backend changes (new endpoints, migrations, model changes, controller updates), ALWAYS restart the API server before testing. Kill the old process and start a new one. Never assume the API is already stopped — verify with `lsof` or `ps`. This is the #1 source of bugs in this project.

## Always Leave Services Running

After completing any work, ALWAYS ensure the following services are running before finishing:
1. **Docker infrastructure**: `cd infra && docker compose up -d` (MySQL, PostgreSQL, MailHog)
2. **API server**: Build the JAR then run it: `cd apps/api-kt && JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" java -jar build/libs/asset-management-api-1.0.0.jar`
3. **Verify**: Confirm login works with `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5115/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'` — should return 200

Never leave the user with a stopped API or database. If you killed a process for testing, restart it before declaring done.

## Database Migrations

When adding or modifying database models/columns, ALWAYS create and apply the EF migration before testing. Never skip this step. After migration, verify the table/column exists. If adding a new column to existing records, implement a backfill strategy.

## Workflow: Always Implement, Don't Just Plan

When the user asks to implement a feature, DO the implementation. Do not spend the entire session exploring the codebase and writing a plan file unless explicitly asked to only plan. If a plan exists, execute it.

## Product goal

Build a multi-user asset management system with:

- Assets, Certificates, Applications/Licences
- Custom fields per type
- Audit log + per-item history timeline
- Assign/unassign + check-in/out
- Retire + sold
- Dashboard for upcoming expiries
- Views (columns, saved views, default views), filters
- Email + Slack alerts
- Reporting
- Full API parity with UI actions

Primary users: IT/admin staff. UX must be consistent and simple.

## Tech stack (fixed)

- Frontend: React + TypeScript + shadcn/ui + Tailwind
- Table/view layer: TanStack Table (or equivalent)
- Backend: ASP.NET Core Web API (.NET 8)
- DB: PostgreSQL
- Local hosting: Docker Compose
- Future hosting: Azure (Container Apps + Azure Database for PostgreSQL + Blob Storage)

## Non-goals for now

- SSO (future; design auth so OIDC can be added later)
- Attachments are low priority (but keep interfaces ready)

---

## UI / UX rules (consistency)

- Use shadcn/ui components everywhere; do NOT hand-roll new UI primitives.
- All pages must use the shared layout shell (sidebar/header) and shared typography/spacing.
- Create and reuse shared components:
  - PageLayout / PageHeader
  - DataTable (filters, column chooser, saved views)
  - FormDialog / ConfirmDialog
  - Toast notifications
- Forms: use a single form pattern across the app (validation + error messages consistent).
- Theme: light/dark/auto implemented centrally; no page-specific theme logic.

## Data table / views rules

- Every “list” page uses the same DataTable component:
  - server-side pagination/sorting/filtering
  - column show/hide
  - saved views per user
  - set default view per user
- Bulk actions use checkbox selection + action bar (delete/archive/etc).

## API rules

- REST API with OpenAPI/Swagger.
- Every UI action must map to an API endpoint (parity).
- API version prefix: /api/v1/...
- Consistent error format and status codes.
- All write operations must emit audit log events.

## Audit log & history rules

- Maintain:
  1. Global audit log (who/what/when, UI vs API)
  2. Per-entity history timeline (assignment events, edits, retire/sold, archive/restore)
- Prefer append-only event records for auditability.
- Soft delete/archive only (restore supported).

## Custom fields rules

- Support field types: text, number, date, boolean, single select, multi-select, URL.
- Custom fields are defined per entity type (asset type, certificates, applications/licences).
- Custom fields must:
  - appear in forms
  - be filterable (where practical)
  - be selectable as columns in DataTable

## Alerts rules

- Email alerts: warranty/cert/licence renewal/expiry
- Slack alerts: nice-to-have (webhooks)
- Alerts must be configurable (on/off, thresholds like 30/14/7 days).

---

# Workflow expectations (how Claude should work)

Claude should follow an explore → plan → implement → verify loop.

## Plan mode default

- Use plan mode for any non-trivial task (3+ steps, schema changes, new modules, architectural decisions).
- If something breaks, stop and re-plan (don’t “push through” blindly).
- Always define success criteria (tests passing, endpoint works, UI renders).

## Verification before "done"

- Never mark complete without proof:
  - run tests/build
  - run lint/format
  - exercise the feature (API call + UI path)
- Prefer automated verification over manual claims.
- **After any backend code change**: restart the API server (`dotnet run`) and verify new/changed endpoints respond correctly with `curl` before declaring done. The API does NOT hot-reload new endpoints.

## Claude input (encouraged, bounded)

- Claude should propose improvements to requirements, UX, data model, and architecture.
- When proposing changes, provide:
  1. the suggestion
  2. why it matters (risk/benefit)
  3. the smallest viable implementation
- If a suggestion would add meaningful scope, Claude must:
  - label it as OPTIONAL
  - put it into tasks/todo.md under "Later"
  - continue with the agreed MVP unless the user explicitly approves.
- Claude may ask up to 1–3 clarifying questions when necessary.

## Product thinking & feedback

- If Claude spots missing requirements, UX issues, security concerns, or edge cases:
  - call them out explicitly
  - suggest a better approach
  - ask up to 1–3 clarifying questions only when necessary
- Claude should guide the user (who is not an expert in coding or UX).
- Avoid overloading the user with long lists of questions.

## Task tracking (simple)

- For multi-step work, create/update:
  - tasks/todo.md (checkbox list + progress)
  - tasks/decisions.md (short ADR-style notes for key choices)
  - tasks/lessons.md (after corrections)
- After user corrections: append a short entry to tasks/lessons.md with:
  - what went wrong
  - the new rule to prevent it happening again

## Keep context lean

- Don’t paste huge logs; summarize and reference file paths.
- If context gets noisy, recommend /clear between unrelated tasks.

---

## Git workflow (strict)

- NEVER commit directly to `main`.
- NEVER merge into `main` (including fast-forward merges). Merging to main must be done via GitHub PR or by the user manually.
- NEVER push to `main`. Only push feature/fix/docs/chore/spike branches to origin.
- ALWAYS create a new branch for any change.
- Branch naming conventions:
  - feature/<kebab-name>
  - fix/<kebab-name>
  - chore/<kebab-name>
  - docs/<kebab-name>
  - spike/<kebab-name>
- Keep branch names short, lowercase, kebab-case.
- Prefer small, focused commits with clear messages.

---

## Changelog (required)

- Maintain a root-level CHANGELOG.md.
- For every meaningful change, append an entry with:
  - timestamp (YYYY-MM-DD HH:mm, 24h)
  - summary of what changed
  - any DB migrations or breaking changes
- Keep entries short and readable.

## Documentation rules

- Use a /docs folder instead of a single docs.md file.
- Update docs when:
  - setup steps change
  - architecture changes
  - API behaviour changes
  - database schema changes in a meaningful way
- Prefer small focused docs:
  - docs/setup.md
  - docs/architecture.md
  - docs/api.md
  - docs/database.md
  - docs/ux-guidelines.md

---

# Coding standards

- Prefer readability over cleverness.
- Small PR-style commits; don’t mix unrelated changes.
- Strong typing everywhere (TS + C#).
- Add tests for core logic (especially permissions, audit logging, custom fields, expiry calculations).

---

# Local dev commands (fill in once repo is created)

## Local stack

- `cd infra && docker compose up -d`

## Frontend

- `cd apps/web && npm install && npm run dev`
- Build: `cd apps/web && npm run build`

## Backend

- `cd apps/api/AssetManagement.Api && dotnet run`
- Build: `cd apps/api/AssetManagement.Api && dotnet build`

## Tests

- <add command>
