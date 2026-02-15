import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { FilterChip } from "../filter-chip";
import { ColumnToggle } from "../column-toggle";
import { Checkbox } from "../ui/checkbox";
import { DateRangeFilter } from "../filters/date-range-filter";
import { NumericRangeFilter } from "../filters/numeric-range-filter";
import { QuickFilterBar } from "../filters/quick-filter-bar";
import type { QuickFilter } from "../filters/quick-filter-bar";
import type { Asset } from "../../types/asset";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";
import type { Person } from "../../types/person";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function plus30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

const ASSET_QUICK_FILTERS: QuickFilter[] = [
  { id: "unassigned", label: "Unassigned", params: { unassigned: "true" } },
  { id: "expiring-soon", label: "Expiring Soon", params: { warrantyExpiryFrom: todayISO(), warrantyExpiryTo: plus30DaysISO() } },
  { id: "high-value", label: "High Value", params: { costMin: "1000" } },
  { id: "in-maintenance", label: "In Maintenance", params: { status: "InMaintenance" } },
];

interface AssetsToolbarProps {
  table: Table<Asset>;
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  includeRetired: boolean;
  onIncludeRetiredChange: (value: boolean) => void;
  includeSold: boolean;
  onIncludeSoldChange: (value: boolean) => void;
  typeId: string;
  onTypeIdChange: (value: string) => void;
  assetTypes: AssetType[];
  locationId: string;
  onLocationIdChange: (value: string) => void;
  locations: Location[];
  assignedPersonId: string;
  onAssignedPersonIdChange: (value: string) => void;
  people: Person[];
  purchaseDateFrom: string;
  purchaseDateTo: string;
  onPurchaseDateFromChange: (value: string) => void;
  onPurchaseDateToChange: (value: string) => void;
  warrantyExpiryFrom: string;
  warrantyExpiryTo: string;
  onWarrantyExpiryFromChange: (value: string) => void;
  onWarrantyExpiryToChange: (value: string) => void;
  costMin: string;
  costMax: string;
  onCostMinChange: (value: string) => void;
  onCostMaxChange: (value: string) => void;
  quickFilter: string;
  onQuickFilterApply: (filter: QuickFilter) => void;
  onQuickFilterClear: () => void;
}

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
];

export function AssetsToolbar({
  table,
  search,
  onSearchChange,
  status,
  onStatusChange,
  includeRetired,
  onIncludeRetiredChange,
  includeSold,
  onIncludeSoldChange,
  typeId,
  onTypeIdChange,
  assetTypes,
  locationId,
  onLocationIdChange,
  locations,
  assignedPersonId,
  onAssignedPersonIdChange,
  people,
  purchaseDateFrom,
  purchaseDateTo,
  onPurchaseDateFromChange,
  onPurchaseDateToChange,
  warrantyExpiryFrom,
  warrantyExpiryTo,
  onWarrantyExpiryFromChange,
  onWarrantyExpiryToChange,
  costMin,
  costMax,
  onCostMinChange,
  onCostMaxChange,
  quickFilter,
  onQuickFilterApply,
  onQuickFilterClear,
}: AssetsToolbarProps) {
  return (
    <div className="space-y-2">
      <QuickFilterBar
        filters={ASSET_QUICK_FILTERS}
        activeFilterId={quickFilter || null}
        onApply={onQuickFilterApply}
        onClear={onQuickFilterClear}
      />
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search assets\u2026"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-[240px]"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterChip
            label="Type"
            value={typeId}
            options={assetTypes.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(v) => onTypeIdChange(v)}
            allLabel="All types"
          />
          <FilterChip
            label="Status"
            value={status === "all" ? "" : status}
            options={STATUS_OPTIONS}
            onChange={(v) => onStatusChange(v || "all")}
            allLabel="All statuses"
          />
          <FilterChip
            label="Location"
            value={locationId}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            onChange={onLocationIdChange}
            allLabel="All locations"
          />
          <FilterChip
            label="Assigned To"
            value={assignedPersonId}
            options={people.map((p) => ({ value: p.id, label: p.fullName }))}
            onChange={onAssignedPersonIdChange}
            allLabel="All people"
          />
          <DateRangeFilter
            label="Purchase Date"
            fromValue={purchaseDateFrom}
            toValue={purchaseDateTo}
            onFromChange={onPurchaseDateFromChange}
            onToChange={onPurchaseDateToChange}
          />
          <DateRangeFilter
            label="Warranty Expiry"
            fromValue={warrantyExpiryFrom}
            toValue={warrantyExpiryTo}
            onFromChange={onWarrantyExpiryFromChange}
            onToChange={onWarrantyExpiryToChange}
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
                checked={includeRetired}
                onCheckedChange={(v) => onIncludeRetiredChange(v === true)}
                className="h-3.5 w-3.5"
              />
              Retired
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={includeSold}
                onCheckedChange={(v) => onIncludeSoldChange(v === true)}
                className="h-3.5 w-3.5"
              />
              Sold
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
