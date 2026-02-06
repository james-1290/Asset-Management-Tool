# Architecture Decision Records

## ADR-001: .NET 10 instead of .NET 8

**Date**: 2026-02-06
**Status**: Accepted

**Context**: The CLAUDE.md spec calls for .NET 8, but only .NET 10 SDK (10.0.102) is installed on the development machine. .NET 8 SDK is not available.

**Decision**: Use .NET 10 (net10.0 target framework). The API surface and patterns are identical to .NET 8. When deploying to Azure, either .NET 10 runtime or a self-contained publish will work.

**Consequence**: If .NET 8 LTS is strictly required for production, install the .NET 8 SDK and change the target framework in the csproj. All code is compatible.

---

## ADR-002: Vite as frontend build tool

**Date**: 2026-02-06
**Status**: Accepted

**Context**: Need a build tool for React + TypeScript + Tailwind.

**Decision**: Use Vite 7.x. It's the standard choice for React SPAs, provides fast HMR, and has first-class Tailwind CSS plugin support.

---

## ADR-003: Enums stored as strings in PostgreSQL

**Date**: 2026-02-06
**Status**: Accepted

**Context**: EF Core can store enums as integers (default) or strings.

**Decision**: Store enums as strings for readability when querying the database directly. Slight storage overhead is acceptable for an admin tool.

---

## ADR-004: Soft delete via IsArchived flag

**Date**: 2026-02-06
**Status**: Accepted

**Context**: CLAUDE.md requires "soft delete/archive only (restore supported)".

**Decision**: All deletable entities have an `IsArchived` boolean. DELETE endpoints set `IsArchived = true` instead of removing rows. GET endpoints filter out archived records by default.

---

## ADR-005: Auto-migration in development

**Date**: 2026-02-06
**Status**: Accepted

**Context**: Need a simple way to apply migrations during local dev.

**Decision**: `Program.cs` auto-applies pending EF Core migrations when `ASPNETCORE_ENVIRONMENT=Development`. Production deployments should use explicit `dotnet ef database update` or a CI step.

---

## ADR-006: CustomFieldValue uses polymorphic EntityId

**Date**: 2026-02-06
**Status**: Accepted

**Context**: Custom fields apply to Assets, Certificates, and Applications. We need a flexible way to associate values with different entity types.

**Decision**: `CustomFieldValue.EntityId` is a UUID that references the owning entity (asset, certificate, or application). The `CustomFieldDefinition.EntityType` enum disambiguates which table the EntityId refers to. This avoids separate join tables per entity type while keeping the schema simple.

**Trade-off**: No database-level FK enforcement on EntityId. Application-level validation ensures referential integrity.

---

## ADR-007: API proxy via Vite dev server

**Date**: 2026-02-06
**Status**: Accepted

**Context**: Frontend and API run on different ports in development.

**Decision**: Vite config proxies `/api/*` requests to `http://localhost:5062`. This avoids CORS issues in dev and mirrors production routing.

---

## ADR-008: Reusable audit logging via IAuditService

**Date**: 2026-02-07
**Status**: Accepted

**Context**: CLAUDE.md requires audit log entries for every write operation and per-asset history timeline.

**Decision**: Centralise audit logging in `IAuditService` / `AuditService` rather than inline in each controller. Controllers inject the service and call `LogAsync()` after successful writes. The service creates an `AuditLog` record for all entities, and additionally creates an `AssetHistory` record when the entity type is "Asset".

**Consequence**: Every new controller gets audit logging for free by injecting `IAuditService`. No auth yet, so `ActorName` defaults to "System".

---

## ADR-009: Asset DTO flattens related entity names

**Date**: 2026-02-07
**Status**: Accepted

**Context**: The Assets API response needs to include the asset type name and location name for display in the frontend table.

**Decision**: `AssetDto` includes flattened `AssetTypeName` and `LocationName` string fields populated via EF Core navigation properties (Include). This avoids extra API calls from the frontend to resolve FK references.

---

## ADR-010: Status changes via general update endpoint

**Date**: 2026-02-07
**Status**: Accepted

**Context**: Assets have a Status enum (Available, Assigned, CheckedOut, etc.). Dedicated endpoints for assign/sell/retire could be built.

**Decision**: For MVP, status is changed through the standard PUT `/api/v1/assets/{id}` endpoint. Dedicated endpoints (e.g. POST `/assets/{id}/assign`) will be added later when workflow logic (e.g. validating user assignment) is needed.
