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
- [x] Docker Compose for PostgreSQL
- [x] .env.example files
- [x] Documentation (setup, architecture, database, API, UX guidelines)

## Next (MVP)

- [ ] Assets CRUD (full endpoint + UI)
- [ ] Locations management UI (wired to API)
- [ ] AssetTypes management UI
- [ ] Assign/unassign assets to users
- [ ] Check-in/check-out workflow
- [ ] Asset history timeline (per-asset)
- [ ] Audit log recording on all write operations
- [ ] Audit log UI page
- [ ] Custom fields: define + render in forms
- [ ] Custom fields: display in DataTable columns
- [ ] User authentication (basic username/password login)
- [ ] Dashboard: upcoming warranty/cert/licence expiries
- [ ] DataTable: server-side pagination, sorting, filtering
- [ ] DataTable: column visibility toggle
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
