# API Reference

Base URL: `http://localhost:5062/api/v1`

## Documentation

- **Scalar UI**: http://localhost:5062/scalar/v1
- **OpenAPI spec**: http://localhost:5062/openapi/v1.json

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check; returns `{ status, timestamp }` |

### Locations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/locations` | List all active locations |
| GET | `/api/v1/locations/{id}` | Get location by ID |
| POST | `/api/v1/locations` | Create a location |
| PUT | `/api/v1/locations/{id}` | Update a location |
| DELETE | `/api/v1/locations/{id}` | Archive a location (soft delete) |

**Create/Update request body:**
```json
{
  "name": "string",
  "address": "string | null",
  "city": "string | null",
  "country": "string | null"
}
```

### Asset Types

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/assettypes` | List all active asset types |
| GET | `/api/v1/assettypes/{id}` | Get asset type by ID |
| POST | `/api/v1/assettypes` | Create an asset type |
| PUT | `/api/v1/assettypes/{id}` | Update an asset type |
| DELETE | `/api/v1/assettypes/{id}` | Archive an asset type (soft delete) |

**Create/Update request body:**
```json
{
  "name": "string",
  "description": "string | null"
}
```

### People

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/people` | List all active people (includes location name) |
| GET | `/api/v1/people/{id}` | Get person by ID |
| POST | `/api/v1/people` | Create a person |
| PUT | `/api/v1/people/{id}` | Update a person |
| DELETE | `/api/v1/people/{id}` | Archive a person (soft delete) |

**Create/Update request body:**
```json
{
  "fullName": "string",
  "email": "string | null",
  "department": "string | null",
  "jobTitle": "string | null",
  "locationId": "guid | null"
}
```

**Response DTO:**
```json
{
  "id": "guid",
  "fullName": "string",
  "email": "string | null",
  "department": "string | null",
  "jobTitle": "string | null",
  "locationId": "guid | null",
  "locationName": "string | null",
  "isArchived": false,
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

**Validation:**
- `fullName` is required
- `locationId`, if provided, must reference an existing, non-archived location (400)

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users` | List all active users (ordered by display name) |

**Response DTO:**
```json
{
  "id": "guid",
  "username": "string",
  "displayName": "string",
  "email": "string",
  "isActive": true
}
```

### Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/assets` | List assets (excludes Retired/Sold by default) |
| GET | `/api/v1/assets/{id}` | Get asset by ID |
| POST | `/api/v1/assets` | Create an asset |
| PUT | `/api/v1/assets/{id}` | Update an asset |
| DELETE | `/api/v1/assets/{id}` | Archive an asset (soft delete) |

**List query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `pageSize` | int | Items per page (default: 25, max: 100) |
| `search` | string | Search by name or asset tag (case-insensitive) |
| `status` | string | Filter to a specific status (e.g. `Retired`). Overrides default exclusions. |
| `includeStatuses` | string | Comma-separated statuses to include that are hidden by default (e.g. `Retired,Sold`). Only applies when `status` is not set. |
| `sortBy` | string | Column to sort by (default: `name`) |
| `sortDir` | string | `asc` or `desc` (default: `asc`) |

By default, `Retired` and `Sold` assets are excluded from list results. Use `includeStatuses=Retired,Sold` to include them.

**Create/Update request body:**
```json
{
  "name": "string",
  "assetTag": "string",
  "serialNumber": "string | null",
  "status": "Available | Assigned | CheckedOut | InMaintenance | Retired | Sold",
  "assetTypeId": "guid",
  "locationId": "guid | null",
  "assignedUserId": "guid | null",
  "purchaseDate": "date | null",
  "purchaseCost": "decimal | null",
  "warrantyExpiryDate": "date | null",
  "notes": "string | null"
}
```

**Validation:**
- `assetTypeId` must reference an existing, non-archived asset type (400)
- `locationId`, if provided, must reference an existing, non-archived location (400)
- `assignedUserId`, if provided, must reference an existing, active user (400)
- `assetTag` must be unique across all assets (409 Conflict)
- `status` must be a valid `AssetStatus` enum value (400)

**Response DTO** includes flattened `assetTypeName`, `locationName`, `assignedUserId`, and `assignedUserName` fields.

### Applications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/applications` | List applications (excludes Inactive by default) |
| GET | `/api/v1/applications/{id}` | Get application by ID |
| POST | `/api/v1/applications` | Create an application |
| PUT | `/api/v1/applications/{id}` | Update an application |
| DELETE | `/api/v1/applications/{id}` | Archive an application (soft delete) |

**List query parameters** follow the same pattern as Assets. By default, `Inactive` applications are excluded. Use `includeStatuses=Inactive` to include them. Status values: `Active`, `Expired`, `Suspended`, `PendingRenewal`, `Inactive`.

### Certificates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/certificates` | List certificates |
| GET | `/api/v1/certificates/{id}` | Get certificate by ID |
| POST | `/api/v1/certificates` | Create a certificate |
| PUT | `/api/v1/certificates/{id}` | Update a certificate |
| DELETE | `/api/v1/certificates/{id}` | Archive a certificate (soft delete) |

**List query parameters** follow the same pattern as Assets. No statuses are hidden by default. The `includeStatuses` param is accepted for consistency but currently has no effect. Status values: `Active`, `Expired`, `PendingRenewal`, `Revoked`.

## Audit Logging

All write operations (create, update, archive) across all controllers automatically create entries in the `AuditLogs` table. Asset writes additionally create `AssetHistory` entries for per-asset timeline tracking.

## Error Format

Standard HTTP status codes. Error responses follow the ASP.NET Core ProblemDetails format:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Not Found",
  "status": 404
}
```

## CORS

Configured to allow `http://localhost:5173` in development. Additional origins can be added via `Cors:Origins` in appsettings.
