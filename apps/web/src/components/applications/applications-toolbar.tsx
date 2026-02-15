import { useState, useRef, useEffect } from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Application } from "../../types/application";
import type { ApplicationType } from "../../types/application-type";

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
}: ApplicationsToolbarProps) {
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

  const hasAdvancedFilters = !!(expiryFrom || expiryTo || costMin || costMax);

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search applications…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="flex items-center gap-1.5">
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
                {[expiryFrom || expiryTo, costMin || costMax].filter(Boolean).length}
              </span>
            )}
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-lg border bg-popover p-3 shadow-md space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiry Date</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={expiryFrom} onChange={(e) => onExpiryFromChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="date" value={expiryTo} onChange={(e) => onExpiryToChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
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
  );
}
