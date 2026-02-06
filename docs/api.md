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
