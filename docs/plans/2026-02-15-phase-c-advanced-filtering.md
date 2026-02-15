# Phase C: Advanced Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add date range, numeric range, location/person/department filters, quick filter chips, and filter persistence in saved views across all list pages.

**Architecture:** Extend existing JPA Specification builders with new optional query params. On the frontend, create reusable filter components (DateRangeFilter, NumericRangeFilter, QuickFilterBar) and wire them into each page's toolbar + URL state. Extend ViewConfiguration to persist new filters in saved views.

**Tech Stack:** Kotlin/Spring Boot (JPA Specifications), React + TypeScript, shadcn/ui, React Query, URL search params

---

## Task 1: Backend — Extend Assets Controller with New Filter Params

**Files:**
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AssetsController.kt`

**Context:** The `buildFilteredSpec()` method (around line 1064) currently accepts `search`, `status`, `includeStatuses`, `typeId`. We need to add: `locationId`, `assignedPersonId`, `purchaseDateFrom`, `purchaseDateTo`, `warrantyExpiryFrom`, `warrantyExpiryTo`, `costMin`, `costMax`, `unassigned`.

**Step 1: Add new @RequestParam to the list endpoint**

In the `getAll()` method, add these parameters after the existing ones:

```kotlin
@RequestParam(required = false) locationId: UUID?,
@RequestParam(required = false) assignedPersonId: UUID?,
@RequestParam(required = false) purchaseDateFrom: String?,
@RequestParam(required = false) purchaseDateTo: String?,
@RequestParam(required = false) warrantyExpiryFrom: String?,
@RequestParam(required = false) warrantyExpiryTo: String?,
@RequestParam(required = false) costMin: BigDecimal?,
@RequestParam(required = false) costMax: BigDecimal?,
@RequestParam(required = false) unassigned: Boolean?,
```

Pass them through to `buildFilteredSpec()`.

**Step 2: Extend buildFilteredSpec() with new predicates**

Add these predicates inside the method, after the existing status filtering block:

```kotlin
// Location filter
if (locationId != null) {
    predicates.add(cb.equal(root.get<UUID>("locationId"), locationId))
}

// Assigned person filter
if (assignedPersonId != null) {
    predicates.add(cb.equal(root.get<UUID>("assignedPersonId"), assignedPersonId))
}

// Unassigned shortcut
if (unassigned == true) {
    predicates.add(cb.isNull(root.get<UUID>("assignedPersonId")))
}

// Purchase date range
if (!purchaseDateFrom.isNullOrBlank()) {
    val from = Instant.parse("${purchaseDateFrom}T00:00:00Z")
    predicates.add(cb.greaterThanOrEqualTo(root.get("purchaseDate"), from))
}
if (!purchaseDateTo.isNullOrBlank()) {
    val to = Instant.parse("${purchaseDateTo}T23:59:59Z")
    predicates.add(cb.lessThanOrEqualTo(root.get("purchaseDate"), to))
}

// Warranty expiry date range
if (!warrantyExpiryFrom.isNullOrBlank()) {
    val from = Instant.parse("${warrantyExpiryFrom}T00:00:00Z")
    predicates.add(cb.greaterThanOrEqualTo(root.get("warrantyExpiryDate"), from))
}
if (!warrantyExpiryTo.isNullOrBlank()) {
    val to = Instant.parse("${warrantyExpiryTo}T23:59:59Z")
    predicates.add(cb.lessThanOrEqualTo(root.get("warrantyExpiryDate"), to))
}

// Cost range
if (costMin != null) {
    predicates.add(cb.greaterThanOrEqualTo(root.get("purchaseCost"), costMin))
}
if (costMax != null) {
    predicates.add(cb.lessThanOrEqualTo(root.get("purchaseCost"), costMax))
}
```

**Step 3: Also update the CSV export endpoint** which calls the same spec builder — pass the new params through there too.

**Step 4: Build and verify**

```bash
cd apps/api-kt && JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ./gradlew build -x test
```

**Step 5: Start API and test with curl**

```bash
JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" java -jar build/libs/asset-management-api-1.0.0.jar &

# Login
TOKEN=$(curl -s -X POST http://localhost:5115/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Test location filter
curl -s "http://localhost:5115/api/v1/assets?locationId=SOME_UUID" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'

# Test cost range
curl -s "http://localhost:5115/api/v1/assets?costMin=500&costMax=2000" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'

# Test unassigned
curl -s "http://localhost:5115/api/v1/assets?unassigned=true" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'

# Test date range
curl -s "http://localhost:5115/api/v1/assets?warrantyExpiryFrom=2025-01-01&warrantyExpiryTo=2025-12-31" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'
```

**Step 6: Commit**

```bash
git add apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AssetsController.kt
git commit -m "feat: add advanced filter params to assets endpoint (location, person, date range, cost range, unassigned)"
```

---

## Task 2: Backend — Extend Certificates, Applications, People, AuditLogs Controllers

**Files:**
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/CertificatesController.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/ApplicationsController.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/PeopleController.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AuditLogsController.kt`

**Context:** Same pattern as Task 1 — add new @RequestParam and extend each controller's `buildSpec()` method.

**Step 1: CertificatesController**

Add to `buildSpec()`:
- `certificateTypeId: UUID?` — already exists as `typeId`, confirm it's wired
- `expiryFrom: String?` / `expiryTo: String?` — date range on `expiryDate` (Instant)

```kotlin
if (!expiryFrom.isNullOrBlank()) {
    val from = Instant.parse("${expiryFrom}T00:00:00Z")
    predicates.add(cb.greaterThanOrEqualTo(root.get("expiryDate"), from))
}
if (!expiryTo.isNullOrBlank()) {
    val to = Instant.parse("${expiryTo}T23:59:59Z")
    predicates.add(cb.lessThanOrEqualTo(root.get("expiryDate"), to))
}
```

**Step 2: ApplicationsController**

Add to `buildSpec()`:
- `expiryFrom: String?` / `expiryTo: String?` — date range on `expiryDate`
- `licenceType: String?` — filter by `LicenceType` enum
- `costMin: BigDecimal?` / `costMax: BigDecimal?` — range on `purchaseCost`

```kotlin
if (!expiryFrom.isNullOrBlank()) {
    val from = Instant.parse("${expiryFrom}T00:00:00Z")
    predicates.add(cb.greaterThanOrEqualTo(root.get("expiryDate"), from))
}
if (!expiryTo.isNullOrBlank()) {
    val to = Instant.parse("${expiryTo}T23:59:59Z")
    predicates.add(cb.lessThanOrEqualTo(root.get("expiryDate"), to))
}
if (!licenceType.isNullOrBlank()) {
    val parsed = runCatching { LicenceType.valueOf(licenceType) }.getOrNull()
    if (parsed != null) {
        predicates.add(cb.equal(root.get<LicenceType>("licenceType"), parsed))
    }
}
if (costMin != null) {
    predicates.add(cb.greaterThanOrEqualTo(root.get("purchaseCost"), costMin))
}
if (costMax != null) {
    predicates.add(cb.lessThanOrEqualTo(root.get("purchaseCost"), costMax))
}
```

**Step 3: PeopleController**

Add to `buildSpec()`:
- `locationId: UUID?` — filter by `locationId`
- `department: String?` — exact match on `department`

```kotlin
if (locationId != null) {
    predicates.add(cb.equal(root.get<UUID>("locationId"), locationId))
}
if (!department.isNullOrBlank()) {
    predicates.add(cb.equal(root.get<String>("department"), department))
}
```

**Step 4: AuditLogsController**

Add to `buildSpec()`:
- `dateFrom: String?` / `dateTo: String?` — date range on `timestamp`

The controller already has `entityType` and `action` filters. Just add date range:

```kotlin
if (!dateFrom.isNullOrBlank()) {
    val from = Instant.parse("${dateFrom}T00:00:00Z")
    predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), from))
}
if (!dateTo.isNullOrBlank()) {
    val to = Instant.parse("${dateTo}T23:59:59Z")
    predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), to))
}
```

**Step 5: Build and verify all controllers**

```bash
cd apps/api-kt && JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ./gradlew build -x test
```

**Step 6: Start API and test each endpoint with curl**

```bash
JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" java -jar build/libs/asset-management-api-1.0.0.jar &
TOKEN=$(curl -s -X POST http://localhost:5115/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Certificates: expiry date range
curl -s "http://localhost:5115/api/v1/certificates?expiryFrom=2025-01-01&expiryTo=2025-12-31" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'

# Applications: cost range + licence type
curl -s "http://localhost:5115/api/v1/applications?costMin=100&licenceType=Subscription" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'

# People: department filter
curl -s "http://localhost:5115/api/v1/people?department=Engineering" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'

# Audit logs: date range
curl -s "http://localhost:5115/api/v1/auditlogs?dateFrom=2025-01-01&dateTo=2025-12-31" -H "Authorization: Bearer $TOKEN" | jq '.totalElements'
```

**Step 7: Commit**

```bash
git add apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/
git commit -m "feat: add advanced filter params to certificates, applications, people, audit log endpoints"
```

---

## Task 3: Frontend — Create Reusable Filter Components

**Files:**
- Create: `apps/web/src/components/filters/date-range-filter.tsx`
- Create: `apps/web/src/components/filters/numeric-range-filter.tsx`
- Create: `apps/web/src/components/filters/active-filter-chips.tsx`
- Create: `apps/web/src/components/filters/add-filter-popover.tsx`

**Context:** These are reusable filter UI components used across all list pages. They follow the existing FilterChip pattern (pill-shaped, popover-based).

**Step 1: Create DateRangeFilter**

A chip that opens a popover with from/to date inputs:

```typescript
// apps/web/src/components/filters/date-range-filter.tsx
import { useState, useRef, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  label: string;          // e.g. "Purchase Date", "Expiry"
  fromValue: string;      // ISO date string or ""
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function DateRangeFilter({ label, fromValue, toValue, onFromChange, onToChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const isActive = !!fromValue || !!toValue;
  const displayText = isActive
    ? `${fromValue || "..."} – ${toValue || "..."}`
    : label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent",
          isActive ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground"
        )}
      >
        <Calendar className="h-3 w-3 shrink-0 opacity-60" />
        <span className="max-w-[200px] truncate">{displayText}</span>
        {isActive && (
          <X className="ml-0.5 h-3 w-3 shrink-0 opacity-60 hover:opacity-100" onClick={(e) => {
            e.stopPropagation();
            onFromChange("");
            onToChange("");
            setOpen(false);
          }} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[280px] rounded-lg border bg-popover p-3 shadow-md">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input type="date" value={fromValue} onChange={(e) => onFromChange(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input type="date" value={toValue} onChange={(e) => onToChange(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create NumericRangeFilter**

Similar chip with min/max number inputs:

```typescript
// apps/web/src/components/filters/numeric-range-filter.tsx
import { useState, useRef, useEffect } from "react";
import { PoundSterling, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumericRangeFilterProps {
  label: string;          // e.g. "Cost"
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  prefix?: string;        // e.g. "£"
}

export function NumericRangeFilter({ label, minValue, maxValue, onMinChange, onMaxChange, prefix = "£" }: NumericRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const isActive = !!minValue || !!maxValue;
  const displayText = isActive
    ? minValue && maxValue
      ? `${prefix}${minValue} – ${prefix}${maxValue}`
      : minValue
        ? `> ${prefix}${minValue}`
        : `< ${prefix}${maxValue}`
    : label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent",
          isActive ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground"
        )}
      >
        <PoundSterling className="h-3 w-3 shrink-0 opacity-60" />
        <span>{displayText}</span>
        {isActive && (
          <X className="ml-0.5 h-3 w-3 shrink-0 opacity-60 hover:opacity-100" onClick={(e) => {
            e.stopPropagation();
            onMinChange("");
            onMaxChange("");
            setOpen(false);
          }} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[240px] rounded-lg border bg-popover p-3 shadow-md">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min ({prefix})</label>
              <input type="number" value={minValue} onChange={(e) => onMinChange(e.target.value)}
                placeholder="0" min="0" step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max ({prefix})</label>
              <input type="number" value={maxValue} onChange={(e) => onMaxChange(e.target.value)}
                placeholder="Any" min="0" step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create ActiveFilterChips**

A row of removable chips showing all active non-trivial filters:

```typescript
// apps/web/src/components/filters/active-filter-chips.tsx
import { X } from "lucide-react";

export interface ActiveFilter {
  key: string;
  label: string;     // e.g. "Cost: > £500"
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  onClearAll: () => void;
}

export function ActiveFilterChips({ filters, onClearAll }: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f) => (
        <span key={f.key} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium">
          {f.label}
          <button type="button" onClick={f.onRemove} className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add apps/web/src/components/filters/
git commit -m "feat: add reusable DateRangeFilter, NumericRangeFilter, ActiveFilterChips components"
```

---

## Task 4: Frontend — Create QuickFilterBar Component

**Files:**
- Create: `apps/web/src/components/filters/quick-filter-bar.tsx`

**Context:** Pre-built one-click filter buttons shown above the filter row. Each button applies a set of backend filter params. The configs are passed per-page.

**Step 1: Create QuickFilterBar**

```typescript
// apps/web/src/components/filters/quick-filter-bar.tsx
import { cn } from "@/lib/utils";

export interface QuickFilter {
  id: string;
  label: string;
  params: Record<string, string>;  // URL param key→value pairs to apply
}

interface QuickFilterBarProps {
  filters: QuickFilter[];
  activeFilterId: string | null;
  onApply: (filter: QuickFilter) => void;
  onClear: () => void;
}

export function QuickFilterBar({ filters, activeFilterId, onApply, onClear }: QuickFilterBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-1">Quick:</span>
      {filters.map((f) => {
        const isActive = activeFilterId === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => isActive ? onClear() : onApply(f)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Define quick filter configs as constants (used by pages later)**

These will be defined inline in each page's toolbar or as exported constants. Examples:

```typescript
// For Assets page:
const ASSET_QUICK_FILTERS: QuickFilter[] = [
  { id: "unassigned", label: "Unassigned", params: { unassigned: "true" } },
  { id: "expiring-soon", label: "Expiring Soon", params: { warrantyExpiryFrom: todayISO(), warrantyExpiryTo: plus30DaysISO() } },
  { id: "high-value", label: "High Value", params: { costMin: "1000" } },
  { id: "in-maintenance", label: "In Maintenance", params: { status: "InMaintenance" } },
];

// For Certificates page:
const CERT_QUICK_FILTERS: QuickFilter[] = [
  { id: "expiring-soon", label: "Expiring Soon", params: { expiryFrom: todayISO(), expiryTo: plus30DaysISO() } },
  { id: "expired", label: "Expired", params: { expiryTo: todayISO() } },
];

// For Applications page:
const APP_QUICK_FILTERS: QuickFilter[] = [
  { id: "expiring-soon", label: "Expiring Soon", params: { expiryFrom: todayISO(), expiryTo: plus30DaysISO() } },
  { id: "expired", label: "Expired", params: { expiryTo: todayISO() } },
  { id: "subscription", label: "Subscription", params: { licenceType: "Subscription" } },
];
```

Helper functions for date calculations:
```typescript
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function plus30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/web/src/components/filters/quick-filter-bar.tsx
git commit -m "feat: add QuickFilterBar component with pre-built filter configs"
```

---

## Task 5: Frontend — Wire Advanced Filters into Assets Page

**Files:**
- Modify: `apps/web/src/lib/api/assets.ts` — add new params to `AssetQueryParams`
- Modify: `apps/web/src/hooks/use-assets.ts` — no changes needed (params pass through)
- Modify: `apps/web/src/components/assets/assets-toolbar.tsx` — add DateRangeFilter, NumericRangeFilter, QuickFilterBar
- Modify: `apps/web/src/pages/assets.tsx` — add URL state for new filters, wire to toolbar, build ActiveFilterChips, update getCurrentConfiguration/applyView

**Step 1: Extend AssetQueryParams**

In `apps/web/src/lib/api/assets.ts`, add to the interface:

```typescript
export interface AssetQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  includeStatuses?: string;
  sortBy?: string;
  sortDir?: string;
  typeId?: string;
  // New advanced filters:
  locationId?: string;
  assignedPersonId?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  warrantyExpiryFrom?: string;
  warrantyExpiryTo?: string;
  costMin?: string;
  costMax?: string;
  unassigned?: string;
}
```

**Step 2: Add URL state for new filters in assets.tsx**

Read new params from URL:

```typescript
const locationIdParam = searchParams.get("locationId") ?? "";
const assignedPersonIdParam = searchParams.get("assignedPersonId") ?? "";
const purchaseDateFromParam = searchParams.get("purchaseDateFrom") ?? "";
const purchaseDateToParam = searchParams.get("purchaseDateTo") ?? "";
const warrantyExpiryFromParam = searchParams.get("warrantyExpiryFrom") ?? "";
const warrantyExpiryToParam = searchParams.get("warrantyExpiryTo") ?? "";
const costMinParam = searchParams.get("costMin") ?? "";
const costMaxParam = searchParams.get("costMax") ?? "";
const unassignedParam = searchParams.get("unassigned") ?? "";
const quickFilterParam = searchParams.get("quickFilter") ?? "";
```

Add them to `queryParams`:

```typescript
const queryParams = useMemo(() => ({
  ...existingParams,
  locationId: locationIdParam || undefined,
  assignedPersonId: assignedPersonIdParam || undefined,
  purchaseDateFrom: purchaseDateFromParam || undefined,
  purchaseDateTo: purchaseDateToParam || undefined,
  warrantyExpiryFrom: warrantyExpiryFromParam || undefined,
  warrantyExpiryTo: warrantyExpiryToParam || undefined,
  costMin: costMinParam || undefined,
  costMax: costMaxParam || undefined,
  unassigned: unassignedParam || undefined,
}), [...deps]);
```

Create handler functions for setting each filter (using same pattern as existing handlers — call `setSearchParams` and reset page to 1).

**Step 3: Update AssetsToolbar**

Add new props for the advanced filters and render:
- DateRangeFilter for "Purchase Date"
- DateRangeFilter for "Warranty Expiry"
- NumericRangeFilter for "Cost"
- FilterChip for "Assigned To" (people list)
- QuickFilterBar above the filter row

The toolbar layout becomes two rows:
1. Quick filter chips row (if any quick filters defined)
2. Search + filter chips + date/cost filters + column toggle

**Step 4: Build ActiveFilterChips from current state**

In assets.tsx, compute active filters from URL params and render ActiveFilterChips below the toolbar:

```typescript
const activeFilters = useMemo(() => {
  const filters: ActiveFilter[] = [];
  if (locationIdParam) {
    const loc = locations.find(l => l.id === locationIdParam);
    filters.push({ key: "locationId", label: `Location: ${loc?.name ?? "..."}`, onRemove: () => clearParam("locationId") });
  }
  if (purchaseDateFromParam || purchaseDateToParam) {
    filters.push({ key: "purchaseDate", label: `Purchase: ${purchaseDateFromParam || "..."} – ${purchaseDateToParam || "..."}`, onRemove: () => { clearParam("purchaseDateFrom"); clearParam("purchaseDateTo"); } });
  }
  // ... etc for each filter
  return filters;
}, [/* deps */]);
```

**Step 5: Update getCurrentConfiguration and applyView**

In `getCurrentConfiguration()`, include the new filter params:

```typescript
function getCurrentConfiguration(): ViewConfiguration {
  return {
    ...existingConfig,
    filters: {
      locationId: locationIdParam || undefined,
      assignedPersonId: assignedPersonIdParam || undefined,
      purchaseDateFrom: purchaseDateFromParam || undefined,
      purchaseDateTo: purchaseDateToParam || undefined,
      warrantyExpiryFrom: warrantyExpiryFromParam || undefined,
      warrantyExpiryTo: warrantyExpiryToParam || undefined,
      costMin: costMinParam || undefined,
      costMax: costMaxParam || undefined,
      unassigned: unassignedParam || undefined,
    },
  };
}
```

In `applyView()`, restore filters from config:

```typescript
if (config.filters) {
  for (const [key, value] of Object.entries(config.filters)) {
    if (value) prev.set(key, value);
    else prev.delete(key);
  }
}
```

**Step 6: Verify TypeScript compiles and test in browser**

```bash
cd apps/web && npx tsc --noEmit
```

Open http://localhost:5173/assets and verify:
- Quick filter chips appear and apply filters
- Date range and cost filters work
- Active filter chips show and are removable
- "Clear all" works
- Saved views persist new filters

**Step 7: Commit**

```bash
git add apps/web/src/lib/api/assets.ts apps/web/src/components/assets/assets-toolbar.tsx apps/web/src/pages/assets.tsx
git commit -m "feat: wire advanced filters into assets page (date range, cost, location, quick filters, active chips)"
```

---

## Task 6: Frontend — Wire Advanced Filters into Certificates, Applications, People, Audit Log Pages

**Files:**
- Modify: `apps/web/src/lib/api/certificates.ts` — add `expiryFrom`, `expiryTo` to CertificateQueryParams
- Modify: `apps/web/src/lib/api/applications.ts` — add `expiryFrom`, `expiryTo`, `licenceType`, `costMin`, `costMax`
- Modify: `apps/web/src/lib/api/people.ts` — add `locationId`, `department`
- Modify: `apps/web/src/lib/api/audit-logs.ts` — add `dateFrom`, `dateTo`
- Modify: `apps/web/src/pages/certificates.tsx` — add URL state, toolbar filters, active chips, saved view persistence
- Modify: `apps/web/src/pages/applications.tsx` — same
- Modify: `apps/web/src/pages/people.tsx` — same
- Modify: `apps/web/src/pages/audit-log.tsx` — same
- Modify: corresponding toolbar components if they exist as separate files

**Context:** Follow the exact same pattern as Task 5 for each page. Each page gets:
1. Extended query params interface
2. New URL state readers
3. New filter UI in toolbar (appropriate filters per entity)
4. ActiveFilterChips
5. QuickFilterBar (for assets, certs, apps only — people and audit log don't need quick filters)
6. Updated getCurrentConfiguration/applyView

**Per page specifics:**

**Certificates:**
- DateRangeFilter for "Expiry" (expiryFrom/expiryTo)
- QuickFilterBar: "Expiring Soon", "Expired"
- TypeId filter already exists

**Applications:**
- DateRangeFilter for "Expiry" (expiryFrom/expiryTo)
- NumericRangeFilter for "Cost" (costMin/costMax)
- FilterChip for "Licence Type" (licenceType) — options from LicenceType enum
- QuickFilterBar: "Expiring Soon", "Expired", "Subscription"

**People:**
- FilterChip for "Location" (locationId) — options from locations API
- FilterChip for "Department" (department) — options from distinct departments (build from people data or hardcode common ones)
- No quick filters

**Audit Log:**
- DateRangeFilter for "Date" (dateFrom/dateTo)
- entityType and action filters already exist
- No quick filters

**Step 1-4:** Implement each page following the Task 5 pattern.

**Step 5: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 6: Test each page in browser**

Open each page and verify filters work end-to-end.

**Step 7: Commit**

```bash
git add apps/web/src/lib/api/ apps/web/src/pages/ apps/web/src/components/
git commit -m "feat: wire advanced filters into certificates, applications, people, audit log pages"
```

---

## Task 7: Frontend — Extend ViewConfiguration Type and Saved Views Integration

**Files:**
- Modify: `apps/web/src/types/saved-view.ts` — add `filters` field to ViewConfiguration

**Context:** The ViewConfiguration interface needs a generic `filters` map so saved views can persist any combination of the new filter params. This was partially handled in Tasks 5-6 within each page, but this task ensures the type is correct and all pages use it consistently.

**Step 1: Update ViewConfiguration type**

```typescript
export interface ViewConfiguration {
  columnVisibility?: Record<string, boolean>;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  status?: string;
  pageSize?: number;
  typeId?: string;
  viewMode?: "list" | "grouped";
  filters?: Record<string, string>;
  // Generic key-value for all advanced filters
  // e.g. { locationId: "uuid", costMin: "500", unassigned: "true", expiryFrom: "2025-01-01" }
}
```

**Step 2: Verify all pages read/write filters consistently**

Check that each page's `getCurrentConfiguration()` includes the `filters` map and `applyView()` restores it.

**Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 4: Test saved views end-to-end**

1. Apply some advanced filters on Assets page
2. Save as new view
3. Clear filters
4. Load the saved view
5. Verify filters are restored

**Step 5: Commit**

```bash
git add apps/web/src/types/saved-view.ts
git commit -m "feat: extend ViewConfiguration with generic filters map for saved views"
```

---

## Task 8: Verification + CHANGELOG + todo.md

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `tasks/todo.md`

**Step 1: Build backend**

```bash
cd apps/api-kt && JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ./gradlew build -x test
```

**Step 2: Build frontend**

```bash
cd apps/web && npx tsc --noEmit && npm run build
```

**Step 3: Start API and verify all new filter params with curl**

Run comprehensive curl tests for each controller.

**Step 4: Update CHANGELOG.md**

Add entry with actual timestamp (run `date '+%Y-%m-%d %H:%M'`):

```markdown
### YYYY-MM-DD HH:mm — Phase C: Advanced Filtering + Quick Filter Chips + Saved Filters

- **Backend**: Added date range, numeric range, location, person, department, unassigned, and licence type filter params to all list endpoints (Assets, Certificates, Applications, People, Audit Log)
- **Frontend**: New reusable filter components — DateRangeFilter, NumericRangeFilter, ActiveFilterChips, QuickFilterBar
- **Frontend**: Quick filter chips on Assets (Unassigned, Expiring Soon, High Value, In Maintenance), Certificates (Expiring Soon, Expired), Applications (Expiring Soon, Expired, Subscription)
- **Frontend**: Active filter summary chips with individual remove + "Clear all"
- **Frontend**: Extended ViewConfiguration with generic `filters` map — saved views now persist all advanced filters
- **Frontend**: All 5 list pages wired with page-appropriate advanced filters
```

**Step 5: Update tasks/todo.md**

Move Phase C items to Done section.

**Step 6: Commit**

```bash
git add CHANGELOG.md tasks/todo.md
git commit -m "docs: update CHANGELOG and todo for Phase C advanced filtering"
```

**Step 7: Ensure API and frontend are running**

Leave both services running as per CLAUDE.md requirements.
