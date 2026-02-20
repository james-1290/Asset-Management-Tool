import { useState, useRef, useEffect } from "react";
import { Checkbox } from "../ui/checkbox";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip } from "../filter-chip";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";
import type { Person } from "../../types/person";

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Deployed" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Repair" },
];

interface AssetsToolbarProps {
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
  const hasAnyFilter = !!(typeId || status || search || includeRetired || includeSold || hasAdvancedFilters);

  function handleClearAll() {
    onTypeIdChange("");
    onStatusChange("all");
    onSearchChange("");
    onIncludeRetiredChange(false);
    onIncludeSoldChange(false);
    onLocationIdChange("");
    onAssignedPersonIdChange("");
    onPurchaseDateFromChange("");
    onPurchaseDateToChange("");
    onWarrantyExpiryFromChange("");
    onWarrantyExpiryToChange("");
    onCostMinChange("");
    onCostMaxChange("");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterChip
        label="Type"
        value={typeId}
        options={assetTypes.map((t) => ({ value: t.id, label: t.name }))}
        onChange={(v) => onTypeIdChange(v)}
        allLabel="All"
      />
      <FilterChip
        label="Status"
        value={status === "all" ? "" : status}
        options={STATUS_OPTIONS}
        onChange={(v) => onStatusChange(v || "all")}
        allLabel="All"
      />
      <div ref={moreRef} className="relative">
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-accent",
            hasAdvancedFilters || moreOpen
              ? "border border-primary/30 bg-primary/5 text-foreground"
              : "text-foreground"
          )}
        >
          <ListFilter className="h-4 w-4 shrink-0" />
          <span>More Filters</span>
          {hasAdvancedFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {[locationId, assignedPersonId, purchaseDateFrom || purchaseDateTo, warrantyExpiryFrom || warrantyExpiryTo, costMin || costMax].filter(Boolean).length}
            </span>
          )}
        </button>
        {moreOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-[360px] rounded-lg border bg-popover p-3 shadow-md space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
              <select
                value={locationId}
                onChange={(e) => onLocationIdChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
              >
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned To</label>
              <select
                value={assignedPersonId}
                onChange={(e) => onAssignedPersonIdChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
              >
                <option value="">All people</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
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
            <div className="flex items-center gap-4 pt-1 border-t">
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
        )}
      </div>
      {hasAnyFilter && (
        <>
          <div className="h-6 w-px bg-border mx-1" />
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm text-primary hover:underline font-medium transition-colors"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}
