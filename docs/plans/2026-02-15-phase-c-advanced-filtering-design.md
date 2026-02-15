# Phase C Design: Advanced Filtering + Quick Filter Chips + Saved Filters

**Date**: 2026-02-15
**Status**: Approved
**Scope**: Extend all list pages with date range filters, numeric filters, quick filter chips, and persist filters in saved views

---

## Context

The app has 6 list pages (Assets, Certificates, Applications, People, Locations, Audit Log) using a shared DataTable with basic filtering: text search, status dropdown, and type dropdown. Saved views persist column visibility and basic filters as JSON.

This is Phase C of a three-phase polish effort:
- **Phase A** (done): Smart Dashboard, Enhanced Search, People 360 + Offboarding, Reports Polish
- **Phase C** (this document): Advanced Filtering + Quick Filter Chips + Saved Filters
- **Phase B** (future): Notification Centre + Scheduled Alerts

---

## 1. Backend — New Filter Query Params

Extend all list endpoints with additional query parameters. No new database tables — these are WHERE clause additions to existing JPA Specifications.

### Assets
- `locationId` (UUID) — filter by location
- `assignedPersonId` (UUID) — filter by assigned person
- `purchaseDateFrom` / `purchaseDateTo` (ISO date) — date range on purchase date
- `warrantyExpiryFrom` / `warrantyExpiryTo` (ISO date) — date range on warranty expiry
- `costMin` / `costMax` (BigDecimal) — numeric range on purchase cost
- `unassigned=true` — shortcut for assignedPersonId IS NULL

### Certificates
- `certificateTypeId` (UUID) — filter by type
- `expiryFrom` / `expiryTo` (ISO date) — date range on expiry

### Applications
- `applicationTypeId` (UUID) — filter by type
- `expiryFrom` / `expiryTo` (ISO date) — date range on expiry
- `licenceType` (String) — filter by licence type
- `costMin` / `costMax` (BigDecimal) — cost range

### People
- `locationId` (UUID) — filter by location
- `department` (String) — filter by department

### Audit Log
- `dateFrom` / `dateTo` (ISO date) — date range
- `action` (String) — filter by action type
- `entityType` (String) — filter by entity type

---

## 2. Frontend — Enhanced Filter Bar

### Filter Bar Layout
A row below the search input, above the table:
- **Active filter chips**: removable chips showing each applied filter (e.g. `Type: Laptop ×`, `Cost: > £500 ×`)
- **"Add Filter" button**: popover to add a new filter — pick field, pick operator, enter value, apply
- **"Clear All" button**: resets all filters
- Existing search input stays at the top

### Filter Field Types
- **Select** (Type, Status, Location, Person, Department): searchable dropdown
- **Date range** (Purchase Date, Warranty Expiry, Expiry): from/to date inputs
- **Numeric range** (Cost): min/max number inputs
- **Boolean** (Unassigned): toggle

### Quick Filter Chips
Pre-built one-click filters shown as buttons before the filter bar:

**Assets**: "Unassigned", "Expiring Soon" (warranty < 30 days), "High Value" (> £1000), "In Maintenance"
**Certificates**: "Expiring Soon", "Expired", "Pending Renewal"
**Applications**: "Expiring Soon", "Expired", "Subscription"

These are shortcuts that apply the corresponding backend filter params.

---

## 3. Saved Views — Extended Configuration

Extend the existing `ViewConfiguration` JSON to include all new filter types:

```typescript
interface ViewConfiguration {
  columnVisibility?: Record<string, boolean>;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  pageSize?: number;
  viewMode?: "list" | "grouped";
  filters?: Record<string, string>;
  // e.g. { "typeId": "uuid", "costMin": "500", "unassigned": "true" }
}
```

- Saving a view persists all active filters
- Loading a view restores all filters
- No backend schema change — configuration column already stores JSON
- Existing saved view UI (dropdown, name, set default) unchanged

---

## Out of Scope

- AND/OR query builder (too complex for current needs)
- Custom field filtering (deferred)
- Filter sharing between users
