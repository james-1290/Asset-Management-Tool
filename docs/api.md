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
- **Auth**: stateless JWT. `POST /auth/login` returns a token; send it as
  `Authorization: Bearer <token>`. SAML SSO and SCIM provisioning are also
  supported.
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

> **URL naming**: newer resources use kebab-case (`/asset-types`). A few older
> routes were historically concatenated (`/assettypes`, `/applicationtypes`,
> `/certificatetypes`, `/auditlogs`); these now respond to the kebab-case path
> as primary while keeping the old path as a backward-compatible alias.

## Common actions (beyond CRUD)

- `POST /certificates/{id}/renew`, `POST /applications/{id}/renew` — roll expiry
  forward, reset to Active, clear pending alerts
- `POST /applications/{id}/seats` / `DELETE /applications/{id}/seats/{personId}`
  — licence seat assignment (over-allocation and duplicates return 409)
- `POST /assets/{id}/restore`, `POST /asset-models/{id}/restore` — un-archive
- `POST /people/{id}/offboard` — check in/transfer assets, release licence seats
- `POST .../bulk-archive`, `POST .../bulk-status` — bulk operations
- `GET .../export` — CSV export of the current filtered view
