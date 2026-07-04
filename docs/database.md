# Database

## Engine & tooling

- **Engine**: MySQL 8 (InnoDB, `utf8mb4`). Locally via Docker (`infra/docker-compose.yml`).
- **Access**: Spring Data JPA / Hibernate (`MySQLDialect`).
- **Migrations**: Flyway. The SQL files under
  `apps/api-kt/src/main/resources/db/migration` (`V001…` onward) are the
  **source of truth** for the schema and are applied automatically on API
  startup. Hibernate runs with `ddl-auto: validate`, so the entity mappings are
  checked against the Flyway-managed schema rather than generating it.
- **UUIDs**: primary keys and foreign keys are `CHAR(36)`.
- **Timestamps**: `DATETIME(6)`; the JDBC connection pins `serverTimezone=UTC`.

To change the schema, add the next `V<nnn>__<description>.sql` migration — do
not edit an applied migration (Flyway is forward-only).

## Tables

Grouped by area (see the migrations for exact columns, indexes, and constraints):

- **Identity & access**: `users`, `roles`, `permissions`, `role_permissions`,
  `user_roles`
- **Core inventory**: `assets`, `asset_types`, `asset_models`, `asset_templates`
- **Certificates**: `certificates`, `certificate_types`
- **Applications / licences**: `applications`, `application_types`,
  `application_seat_assignments`
- **Organisation**: `people`, `locations`
- **Custom fields**: `custom_field_definitions`, `custom_field_values`
  (polymorphic — a value's `entity_id` points at the owning asset/certificate/
  application; the definition's entity type disambiguates)
- **History & audit**: `audit_logs` (global), plus per-entity timelines
  `asset_history` / `certificate_history` / `application_history` /
  `person_history` and their `*_history_changes` field-level change tables
- **Alerts & notifications**: `alert_history`, `user_notifications`,
  `user_alert_rules`
- **Settings & views**: `system_settings`, `saved_views`, `attachments`

## Conventions

- **Soft delete**: deletable entities carry an `is_archived` flag; DELETE
  endpoints set it to true and reads exclude archived rows by default. Restore
  is supported.
- **Optimistic locking**: core entities carry a `@Version` column
  (`version` / `entity_version`).
- **Derived counters**: an application's `used_seats` is derived from
  `application_seat_assignments` and maintained on assign/release.
- **Enums** are stored as readable strings.

## Migration history (high level)

`V001` initial schema → subsequent migrations add alert history, SAML/SCIM
columns, depreciation defaults, asset templates, FK/performance indexes,
notifications & alert rules, attachments, optimistic-lock columns, asset
models, token-invalidation, and application seat assignments. See the
`db/migration` directory for the authoritative, ordered list.
