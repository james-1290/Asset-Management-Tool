import { useState, useRef, useEffect } from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { FilterChip } from "../filter-chip";
import { ColumnToggle } from "../column-toggle";
import { Checkbox } from "../ui/checkbox";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset } from "../../types/asset";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";
import type { Person } from "../../types/person";

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
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
}

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
}: AssetsToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [moreOpen]);

  const hasAdvancedFilters = !!(locationId || assignedPersonId || purchaseDateFrom || purchaseDateTo || warrantyExpiryFrom || warrantyExpiryTo || costMin || costMax);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search assets…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="flex items-center gap-1.5">
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
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent",
              hasAdvancedFilters || moreOpen
                ? "border-primary/30 bg-primary/5 text-foreground"
                : "border-border text-muted-foreground"
            )}
          >
            <ListFilter className="h-3 w-3 shrink-0" />
            More
            {hasAdvancedFilters && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {[locationId, assignedPersonId, purchaseDateFrom || purchaseDateTo, warrantyExpiryFrom || warrantyExpiryTo, costMin || costMax].filter(Boolean).length}
              </span>
            )}
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-lg border bg-popover p-3 shadow-md space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <FilterChip
                  label="All locations"
                  value={locationId}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={onLocationIdChange}
                  allLabel="All locations"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned To</label>
                <FilterChip
                  label="All people"
                  value={assignedPersonId}
                  options={people.map((p) => ({ value: p.id, label: p.fullName }))}
                  onChange={onAssignedPersonIdChange}
                  allLabel="All people"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Purchase Date</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={purchaseDateFrom} onChange={(e) => onPurchaseDateFromChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="date" value={purchaseDateTo} onChange={(e) => onPurchaseDateToChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Warranty Expiry</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={warrantyExpiryFrom} onChange={(e) => onWarrantyExpiryFromChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="date" value={warrantyExpiryTo} onChange={(e) => onWarrantyExpiryToChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cost (£)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={costMin} onChange={(e) => onCostMinChange(e.target.value)} placeholder="Min" min="0" step="0.01" className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="number" value={costMax} onChange={(e) => onCostMaxChange(e.target.value)} placeholder="Max" min="0" step="0.01" className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>
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
  );
}
