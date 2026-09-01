# API Reference

Base URL: `http://localhost:5115/api/v1`

## Source of truth

The API is documented live via **springdoc-openapi**:

- Swagger UI: `http://localhost:5115/swagger-ui.html`
- OpenAPI JSON: `http://localhost:5115/v3/api-docs`

Swagger is gated by `SWAGGER_ENABLED` (off by default; set `SWAGGER_ENABLED=true`
to expose it in dev). Treat the generated spec as authoritative for exact
request/response shapes; this page is an orientation map only.

## Conventions

- **Prefix**: all endpoints live under `/api/v1`.
- **Auth**: Microsoft Entra sign-in via Azure App Service built-in
  authentication. The browser carries the platform session cookie; the app
  reads the identity from the `X-MS-CLIENT-PRINCIPAL` headers the platform
  injects. There is no application login endpoint — sign-in and sign-out are
  `/.auth/login/aad` and `/.auth/logout`. `GET /auth/me` reports the current
  user. Writes must echo the `XSRF-TOKEN` cookie in an `X-XSRF-TOKEN` header
  (CSRF protection); SCIM machine callers use a bearer token and are exempt.
- **Roles**: come from Entra app roles (`Admin`, `Operator`, `User`) and are
  mirrored into the local user on every request. A user holding no app role is
  refused with `403 no_role_assigned`.
- **RBAC**: reads generally require any authenticated user; writes require
  `Admin` or `Operator`; user/settings/audit administration requires `Admin`.
- **Pagination**: list endpoints take `page` / `pageSize` and return a
  `PagedResponse` (`items`, `page`, `pageSize`, `totalCount`). `pageSize` is
  clamped server-side.
- **Errors**: JSON `{ "error": "..." }` with appropriate status codes
  (400 validation/bad input, 401 unauthenticated, 403 forbidden, 404 not found,
  409 conflict/optimistic-lock).
- **Soft delete**: `DELETE` archives; reads exclude archived by default.

## Resource groups

- **Auth & identity**: `/auth`, `/profile`, `/users`, `/roles`, `/scim/v2/*`
- **Inventory**: `/assets`, `/asset-types`, `/asset-models`, `/asset-templates`
- **Certificates**: `/certificates`, `/certificate-types`
- **Applications / licences**: `/applications`, `/application-types`
  (incl. `/applications/{id}/renew` and `/applications/{id}/seats`)
- **Organisation**: `/people` (incl. `/people/{id}/offboard`), `/locations`
- **Cross-cutting**: `/attachments`, `/audit-logs`, `/notifications`,
  `/user-notifications`, `/alerts`, `/user-alert-rules`, `/saved-views`,
  `/search`, `/dashboard`, `/reports`, `/import`, `/settings`, `/health`

> **URL naming**: every resource uses kebab-case (`/asset-types`). Four routes
> were historically concatenated (`/assettypes`, `/applicationtypes`,
> `/certificatetypes`, `/auditlogs`) and were kept as aliases; they have been
> removed. The frontend never used them and there is no external consumer, and
> a path that answers is a path that has to be secured, tested and kept working.
> One exception remains for the same historical reason: custom field definitions
> are read from `/{id}/customfields`, not `/{id}/custom-fields`.

## Common actions (beyond CRUD)

- `POST /certificates/{id}/renew`, `POST /applications/{id}/renew` — roll expiry
  forward, reset to Active, clear pending alerts
- `POST /applications/{id}/seats` / `DELETE /applications/{id}/seats/{personId}`
  — licence seat assignment (over-allocation and duplicates return 409)
- `POST /assets/{id}/restore`, `POST /asset-models/{id}/restore` — un-archive
- `POST /people/{id}/offboard` — check in/transfer assets, release licence seats
- `POST .../bulk-archive`, `POST .../bulk-status` — bulk operations
- `GET .../export` — CSV export of the current filtered view

## Error responses

Every error returns JSON with an `error` key holding a message written for the
person who will read it:

```json
{ "error": "Asset must be Available to check out. Current status: CheckedOut" }
```

Some responses add fields on top of that, deliberately:

| Extra field | Where | Why |
|---|---|---|
| `code` | Sign-in refusals (401/403) | Lets the app tell "no role assigned" from "account deactivated" and show the right screen, rather than parsing the message |
| `errorId` | Unhandled 500s | Correlates the response with the logged stack trace; quote it in a bug report |
| `message` and `counts` | `DELETE /locations/{id}` returning 409 | The app uses the counts to offer reassignment instead of a dead end, so it needs the numbers, not prose |
| `fields` | Validation failures (400) | Per-field messages, so a form can mark the offending inputs |

The rule: `error` is always present and always safe to show. Anything else is
additive, and a client that ignores the extras still behaves correctly. Never
remove `error` from a response "because the richer field says the same thing" —
every client reads `error` first.

Responses also carry an `X-Request-Id` header. It is echoed from the request if
one was supplied and generated otherwise, and every log line written while
handling that request is tagged with it.
