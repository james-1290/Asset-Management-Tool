# Architecture

## Monorepo Structure

```
/
├── apps/
│   ├── web/              # React + TypeScript + Vite
│   └── api-kt/           # Kotlin + Spring Boot API (the backend)
├── infra/                # Docker Compose (MySQL, MailHog), infrastructure config
├── docs/                 # Documentation
├── tasks/                # Task tracking (todo, decisions, lessons)
├── CHANGELOG.md
└── CLAUDE.md             # Claude Code instructions
```

## Frontend (`apps/web`)

- **Framework**: React 19 + TypeScript
- **Build tool**: Vite 7
- **UI library**: shadcn/ui (New York style) + Tailwind CSS v4
- **Routing**: React Router v7
- **Data/query**: TanStack Query + TanStack Table v8
- **Icons**: Lucide React
- **Theme**: light/dark/system with CSS variables

### Key patterns

- Shared `Layout` component with sidebar navigation and header
- All pages rendered inside the layout via `<Outlet />`
- `@/` path alias resolves to `src/`
- shadcn/ui components in `src/components/ui/`
- Reusable `DataTable` component for all list pages
- Per-entity API modules in `src/lib/api/` and React Query hooks in `src/hooks/`

## Backend (`apps/api-kt`)

- **Language/framework**: Kotlin on Spring Boot (JDK 21)
- **Build**: Gradle (`./gradlew`), runnable fat JAR via `bootJar`
- **Persistence**: Spring Data JPA / Hibernate over MySQL
- **Migrations**: Flyway (SQL under `src/main/resources/db/migration`)
- **Auth**: stateless JWT; SAML 2.0 SSO + SCIM 2.0 provisioning (Entra ID)
- **API docs**: springdoc-openapi (Swagger UI), gated by `SWAGGER_ENABLED`
- **API prefix**: `/api/v1/`

### Key patterns

- Controllers in `controller/`, DTOs in `dto/`, JPA entities in `model/`,
  enums in `model/enums/`, Spring Data repositories in `repository/`
- RBAC via method-level `@PreAuthorize` (`Admin` / `Operator` / `User`)
- Enums stored as strings for readable ad-hoc queries
- Soft delete via `isArchived` flag (no hard deletes; restore supported)
- Centralised audit logging + per-entity history via `AuditService`
- Read DTOs flatten related names (e.g. `assetTypeName`, `locationName`) for the UI

## Infrastructure

- **Database**: MySQL 8 (Docker)
- **Mail (dev)**: MailHog (Docker)
- **Local dev**: Docker Compose for MySQL + MailHog; API and web run natively
- **Future**: Azure Container Apps + Azure Database for MySQL + Blob Storage
  (attachments currently use local disk; see the backlog in `tasks/todo.md`)

## Data Flow

```
Browser → Vite dev server (port 5173)
           ├── Static assets (served directly)
           └── /api/*, /saml2, /login/saml2, /scim
                 → Proxy → Spring Boot API (port 5115)
                              └── MySQL (port 3306)
```
