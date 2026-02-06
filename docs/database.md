# Database Schema

## Overview

PostgreSQL 16, managed via EF Core migrations. Connection string configured in `appsettings.json`.

## Tables

### Users
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| Username | text | Unique |
| PasswordHash | text | BCrypt hash (placeholder) |
| Email | text | Unique |
| DisplayName | text | |
| IsActive | boolean | Default true |
| CreatedAt | timestamp | UTC |
| UpdatedAt | timestamp | UTC |

### Roles
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| Name | text | |
| Description | text | Nullable |
| CreatedAt | timestamp | UTC |

### Permissions
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| Name | text | |
| Description | text | Nullable |

### UserRoles (join table)
| Column | Type | Notes |
|--------|------|-------|
| UserId | UUID | FK → Users, composite PK |
| RoleId | UUID | FK → Roles, composite PK |

### RolePermissions (join table)
| Column | Type | Notes |
|--------|------|-------|
| RoleId | UUID | FK → Roles, composite PK |
| PermissionId | UUID | FK → Permissions, composite PK |

### Locations
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| Name | text | |
| Address | text | Nullable |
| City | text | Nullable |
| Country | text | Nullable |
| IsArchived | boolean | Soft delete |
| CreatedAt | timestamp | UTC |
| UpdatedAt | timestamp | UTC |

### People
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| FullName | text | Required |
| Email | text | Nullable |
| Department | text | Nullable |
| JobTitle | text | Nullable |
| LocationId | UUID | FK → Locations, nullable, SET NULL on delete |
| IsArchived | boolean | Soft delete |
| CreatedAt | timestamp | UTC |
| UpdatedAt | timestamp | UTC |

### AssetTypes
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| Name | text | e.g. Laptop, Monitor |
| Description | text | Nullable |
| IsArchived | boolean | Soft delete |
| CreatedAt | timestamp | UTC |
| UpdatedAt | timestamp | UTC |

### Assets
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| Name | text | |
| AssetTag | text | Unique |
| SerialNumber | text | Nullable |
| Status | text | Enum: Available, Assigned, CheckedOut, InMaintenance, Retired, Sold, Archived |
| AssetTypeId | UUID | FK → AssetTypes |
| LocationId | UUID | FK → Locations, nullable, SET NULL on delete |
| AssignedUserId | UUID | FK → Users, nullable, SET NULL on delete |
| WarrantyExpiryDate | timestamp | Nullable |
| PurchaseDate | timestamp | Nullable |
| PurchaseCost | decimal(18,2) | Nullable |
| DepreciationMonths | int | Nullable |
| SoldDate | timestamp | Nullable |
| SoldPrice | decimal(18,2) | Nullable |
| Notes | text | Nullable |
| IsArchived | boolean | Soft delete |
| CreatedAt | timestamp | UTC |
| UpdatedAt | timestamp | UTC |

### AssetHistory
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| AssetId | UUID | FK → Assets, indexed |
| EventType | text | Enum: Created, Assigned, Unassigned, CheckedIn, CheckedOut, Edited, Retired, Sold, Archived, Restored |
| PerformedByUserId | UUID | FK → Users, nullable |
| Details | text | JSON/text, nullable |
| Timestamp | timestamp | UTC |

### AuditLogs
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| ActorId | UUID | Nullable |
| ActorName | text | |
| Action | text | |
| EntityType | text | |
| EntityId | text | |
| Source | text | Enum: UI, API |
| Details | text | JSON, nullable |
| Timestamp | timestamp | UTC, indexed |

Index on `(EntityType, EntityId)` for entity-scoped queries.

### CustomFieldDefinitions
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| EntityType | text | Enum: Asset, Certificate, Application |
| AssetTypeId | UUID | FK → AssetTypes, nullable (for type-specific fields) |
| Name | text | |
| FieldType | text | Enum: Text, Number, Date, Boolean, SingleSelect, MultiSelect, Url |
| Options | text | JSON array for select types, nullable |
| IsRequired | boolean | |
| SortOrder | int | |
| IsArchived | boolean | |
| CreatedAt | timestamp | UTC |

### CustomFieldValues
| Column | Type | Notes |
|--------|------|-------|
| Id | UUID | PK |
| CustomFieldDefinitionId | UUID | FK → CustomFieldDefinitions |
| EntityId | UUID | Polymorphic reference |
| Value | text | Nullable |
| CreatedAt | timestamp | UTC |
| UpdatedAt | timestamp | UTC |

Index on `(CustomFieldDefinitionId, EntityId)`.

## Migrations

Migrations live in `apps/api/AssetManagement.Api/Data/Migrations/`.

- Auto-applied on startup in Development mode
- Manual commands: see [setup.md](./setup.md)
