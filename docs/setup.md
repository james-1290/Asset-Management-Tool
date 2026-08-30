# Local Development Setup (macOS)

## Prerequisites

- **Node.js** v20+
- **JDK 21** (the API is Kotlin/Spring Boot; `JAVA_HOME` must point at a JDK 21 install)
- **Docker** and **Docker Compose**

## 1. Start infrastructure

```bash
cd infra
docker compose up -d
```

This starts:
- **MySQL 8** on port 3306 (database `assetmgmt`, default credentials `root` / `root`), with a persisted volume.
- **MailHog** on ports 1025 (SMTP) and 8025 (web UI) for catching alert emails in dev.

## 2. Run the API

```bash
cd apps/api-kt
./gradlew build
SPRING_PROFILES_ACTIVE=dev java -jar build/libs/asset-management-api-1.0.0.jar
```

The `dev` profile is **required** for local runs: it's the only mode in which
the app runs the local sign-in emulator instead of expecting Azure App Service's
authentication in front of it. With no profile set (or any non-dev profile) the
app fails fast — deliberately, so a production deploy can't boot with
development settings.

The API starts on `http://localhost:5115`. On startup it applies any pending
**Flyway** migrations automatically.

- API base: `http://localhost:5115/api/v1`
- Swagger UI: `http://localhost:5115/swagger-ui.html` (enable with `SWAGGER_ENABLED=true`; off by default)
- Local Entra sign-in (dev only): `http://localhost:5115/.auth/login/aad`

### Signing in locally the way production will work

Production runs on **Azure App Service with Entra SSO**, where the platform's
auth sidecar authenticates the user and passes the identity to the app in
`X-MS-CLIENT-PRINCIPAL` headers. There is no sidecar on a developer machine, so
the `dev` profile enables a **local emulator** of it (`LocalEasyAuthEmulator`)
that produces the identical headers from a chosen developer identity.

The app therefore runs the *same* authentication code path locally as it does on
Azure — moving to App Service means switching the emulator off and letting the
real sidecar supply the headers. No code changes.

Visit `http://localhost:5115/.auth/login/aad` (or `/.auth/login/aad` through the
frontend, same origin) to pick an identity:

| Identity | Role | Purpose |
|----------|------|---------|
| `admin` | Admin | Full access |
| `operator` | Operator | Create/edit records |
| `user` | User | Read-only |
| `norole` | *none* | Verifies that a principal with no app role is **refused** |

Other `/.auth` endpoints match the App Service contract: `/.auth/logout` and
`/.auth/me`. Override the identity list with `EASY_AUTH_LOCAL_IDENTITIES`
(`key:email:Display Name:Role1|Role2`, comma-separated).

The emulator **refuses to start unless a `dev`/`local`/`test` profile is
active** — it mints identities without a password, so it must never run
anywhere else.

## 3. Run the Frontend

```bash
cd apps/web
npm install   # first time only
npm run dev
```

The frontend starts on `http://localhost:5173`. API calls (`/api`, `/.auth`,
`/scim`) are proxied to `http://localhost:5115` via Vite config, so the browser
sees a single origin — the same shape as App Service, where `/.auth` is answered
by the platform.

## 4. Run everything (quick start)

Open three terminals:

```bash
# Terminal 1: infrastructure
cd infra && docker compose up -d

# Terminal 2: API (requires JDK 21)
cd apps/api-kt && ./gradlew build && SPRING_PROFILES_ACTIVE=dev java -jar build/libs/asset-management-api-1.0.0.jar

# Terminal 3: frontend
cd apps/web && npm run dev
```

## Environment / configuration

- `infra/.env` — MySQL container credentials (copy from `infra/.env.example`).
- `apps/web/.env` — frontend overrides (copy from `apps/web/.env.example`).
- The API is configured through `apps/api-kt/src/main/resources/application.yml`,
  with every secret overridable by an environment variable. For anything other
  than local dev you must set at least: `EASY_AUTH_ENABLED=true`,
  `DB_USERNAME`/`DB_PASSWORD`, and — if SCIM is enabled — `SCIM_BEARER_TOKEN`.
  There are no application secrets to configure for sign-in: identity is Azure
  App Service's built-in authentication, so the app holds no signing key,
  client secret or passwords. The app boots with development settings **only**
  under an explicit dev profile (`SPRING_PROFILES_ACTIVE=dev`); with no profile
  set, or any other profile, it refuses to start unless Easy Auth is enabled and
  the local emulator is off. That fail-closed default means a deploy that forgets
  to configure authentication aborts rather than serving unauthenticated.

## Database migrations

Migrations are plain SQL under `apps/api-kt/src/main/resources/db/migration`,
applied automatically by Flyway on API startup.

To add one, create the next `V<nnn>__<description>.sql` file (e.g.
`V015__add_widget_table.sql`) — Flyway runs new versions in order on the next
boot. Migrations are forward-only; write a new migration to change the schema
rather than editing an applied one.

## Running tests

```bash
# Frontend — Vitest unit tests + ESLint
cd apps/web && npm run test && npm run lint

# Backend — unit + integration tests (also runs as part of `./gradlew build`)
cd apps/api-kt && ./gradlew test
```

The backend integration tests (`…/api/integration`) spin up a throwaway MySQL
container via **Testcontainers**, so Docker must be running. Flyway migrates the
container from clean each run, so these also verify migrations + Hibernate's
`ddl-auto: validate` against a real schema.

**Docker Desktop note:** Docker Desktop sets a `MinAPIVersion` that can be higher
than the API version docker-java negotiates by default, making Testcontainers
fail with a `Status 400` "Could not find a valid Docker environment". If you hit
that, pin the API version for the test run:

```bash
DOCKER_API_VERSION=1.44 ./gradlew test
```

The test task forwards `DOCKER_API_VERSION` to docker-java when set; it is unset
in CI (standard Linux dockerd), where default negotiation works.

## Building for production

```bash
# Frontend
cd apps/web && npm run build       # outputs to dist/

# Backend
cd apps/api-kt && ./gradlew bootJar # outputs build/libs/asset-management-api-1.0.0.jar
```
