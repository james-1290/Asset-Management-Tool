import { useState, useRef, useEffect } from "react";
import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "../../types/audit-log";

const entityTypeOptions = [
  { value: "Asset", label: "Asset" },
  { value: "Location", label: "Location" },
  { value: "AssetType", label: "Asset Type" },
  { value: "Person", label: "Person" },
];

const actionOptions = [
  { value: "Created", label: "Created" },
  { value: "Updated", label: "Updated" },
  { value: "Archived", label: "Archived" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "CheckedIn", label: "Checked In" },
];

interface AuditLogsToolbarProps {
  table: Table<AuditLogEntry>;
  search: string;
  onSearchChange: (value: string) => void;
  entityType: string;
  onEntityTypeChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function AuditLogsToolbar({
  table,
  search,
  onSearchChange,
  entityType,
  onEntityTypeChange,
  action,
  onActionChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: AuditLogsToolbarProps) {
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

  const hasAdvancedFilters = !!(dateFrom || dateTo);

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search audit logs..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="flex items-center gap-1.5">
        <FilterChip
          label="Entity Type"
          value={entityType}
          options={entityTypeOptions}
          onChange={(v) => onEntityTypeChange(v || "all")}
          allLabel="All Types"
        />
        <FilterChip
          label="Action"
          value={action}
          options={actionOptions}
          onChange={(v) => onActionChange(v || "all")}
          allLabel="All Actions"
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
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
            )}
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-lg border bg-popover p-3 shadow-md space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Range</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
