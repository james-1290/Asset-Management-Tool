import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import { DateRangeFilter } from "../filters/date-range-filter";
import { NumericRangeFilter } from "../filters/numeric-range-filter";
import { QuickFilterBar } from "../filters/quick-filter-bar";
import type { QuickFilter } from "../filters/quick-filter-bar";
import type { Application } from "../../types/application";
import type { ApplicationType } from "../../types/application-type";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function plus30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

const APP_QUICK_FILTERS: QuickFilter[] = [
  { id: "expiring-soon", label: "Expiring Soon", params: { expiryFrom: todayISO(), expiryTo: plus30DaysISO() } },
  { id: "expired", label: "Expired", params: { status: "Expired" } },
  { id: "subscription", label: "Subscription", params: { licenceType: "Subscription" } },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "PendingRenewal", label: "Pending Renewal" },
  { value: "Suspended", label: "Suspended" },
] as const;

const LICENCE_TYPE_OPTIONS = [
  { value: "Subscription", label: "Subscription" },
  { value: "Perpetual", label: "Perpetual" },
  { value: "OpenSource", label: "Open Source" },
  { value: "Freeware", label: "Freeware" },
  { value: "SiteLicence", label: "Site Licence" },
  { value: "VolumeLicence", label: "Volume Licence" },
  { value: "Trial", label: "Trial" },
  { value: "Other", label: "Other" },
];

interface ApplicationsToolbarProps {
  table: Table<Application>;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  includeInactive: boolean;
  onIncludeInactiveChange: (value: boolean) => void;
  typeId: string;
  onTypeIdChange: (value: string) => void;
  applicationTypes: ApplicationType[];
  expiryFrom: string;
  expiryTo: string;
  onExpiryFromChange: (value: string) => void;
  onExpiryToChange: (value: string) => void;
  licenceType: string;
  onLicenceTypeChange: (value: string) => void;
  costMin: string;
  costMax: string;
  onCostMinChange: (value: string) => void;
  onCostMaxChange: (value: string) => void;
  quickFilter: string;
  onQuickFilterApply: (filter: QuickFilter) => void;
  onQuickFilterClear: () => void;
}

export function ApplicationsToolbar({
  table,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  includeInactive,
  onIncludeInactiveChange,
  typeId,
  onTypeIdChange,
  applicationTypes,
  expiryFrom,
  expiryTo,
  onExpiryFromChange,
  onExpiryToChange,
  licenceType,
  onLicenceTypeChange,
  costMin,
  costMax,
  onCostMinChange,
  onCostMaxChange,
  quickFilter,
  onQuickFilterApply,
  onQuickFilterClear,
}: ApplicationsToolbarProps) {
  return (
    <div className="space-y-2">
      <QuickFilterBar
        filters={APP_QUICK_FILTERS}
        activeFilterId={quickFilter || null}
        onApply={onQuickFilterApply}
        onClear={onQuickFilterClear}
      />
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search applications..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-[240px]"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterChip
            label="Type"
            value={typeId}
            options={applicationTypes.map((t) => ({ value: t.id, label: t.name }))}
            onChange={onTypeIdChange}
            allLabel="All types"
          />
          <FilterChip
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={onStatusFilterChange}
            allLabel="All statuses"
          />
          <FilterChip
            label="Licence"
            value={licenceType}
            options={LICENCE_TYPE_OPTIONS}
            onChange={onLicenceTypeChange}
            allLabel="All licences"
          />
          <DateRangeFilter
            label="Expiry"
            fromValue={expiryFrom}
            toValue={expiryTo}
            onFromChange={onExpiryFromChange}
            onToChange={onExpiryToChange}
          />
          <NumericRangeFilter
            label="Cost"
            minValue={costMin}
            maxValue={costMax}
            onMinChange={onCostMinChange}
            onMaxChange={onCostMaxChange}
          />
          <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-border">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={includeInactive}
                onCheckedChange={(v) => onIncludeInactiveChange(v === true)}
                className="h-3.5 w-3.5"
              />
              Inactive
            </label>
          </div>
        </div>
        <div className="ml-auto">
          <ColumnToggle table={table} />
        </div>
      </div>
    </div>
  );
}
