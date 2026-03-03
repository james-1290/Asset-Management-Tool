import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Button } from "../ui/button";
import { ListFilter, Search, ChevronDown } from "lucide-react";
import type { AuditLogEntry } from "../../types/audit-log";

const entityTypeOptions = [
  { value: "Asset", label: "Asset" },
  { value: "AssetType", label: "Asset Type" },
  { value: "Location", label: "Location" },
  { value: "Person", label: "Person" },
  { value: "Certificate", label: "Certificate" },
  { value: "CertificateType", label: "Certificate Type" },
  { value: "Application", label: "Application" },
  { value: "ApplicationType", label: "Application Type" },
];

const actionOptions = [
  { value: "Created", label: "Created", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "Updated", label: "Updated", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "Archived", label: "Archived", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { value: "Restored", label: "Restored", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "CheckedOut", label: "Checked Out", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "CheckedIn", label: "Checked In", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
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
  // Parse comma-separated actions into a Set
  const selectedActions = new Set(
    action ? action.split(",").filter(Boolean) : []
  );

  function toggleAction(value: string) {
    const next = new Set(selectedActions);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const joined = Array.from(next).join(",");
    onActionChange(joined || "all");
  }

  function clearActions() {
    onActionChange("all");
  }

  const hasAdvancedFilters = !!(dateFrom || dateTo);
  const hasAnyFilter = !!(search || (entityType && entityType !== "all") || selectedActions.size > 0 || dateFrom || dateTo);

  function handleClearFilters() {
    onSearchChange("");
    onEntityTypeChange("all");
    onActionChange("all");
    onDateFromChange("");
    onDateToChange("");
  }

  const actionButtonLabel = selectedActions.size === 0
    ? "All Activities"
    : selectedActions.size === 1
      ? actionOptions.find((o) => selectedActions.has(o.value))?.label ?? "1 selected"
      : `${selectedActions.size} activities`;

  return (
    <div className="flex flex-1 flex-wrap items-center gap-3">
      {/* Activity type multi-select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 font-normal ${selectedActions.size > 0 ? "border-primary/30 bg-primary/5" : ""}`}
          >
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            {actionButtonLabel}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <div className="p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Activity Types</p>
            {actionOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedActions.has(opt.value)}
                  onCheckedChange={() => toggleAction(opt.value)}
                />
                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${opt.color}`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          {selectedActions.size > 0 && (
            <div className="border-t px-3 py-2">
              <button
                type="button"
                onClick={clearActions}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Clear selection
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Entity Type */}
      <Select
        value={entityType || "all"}
        onValueChange={onEntityTypeChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Entity Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entity Types</SelectItem>
          {entityTypeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 font-normal ${hasAdvancedFilters ? "border-primary/30 bg-primary/5" : ""}`}
          >
            Date Range
            {hasAdvancedFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-3" align="start">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Range</label>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Text search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Clear Filters */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={handleClearFilters}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
        >
          Clear Filters
        </button>
      )}

      {/* Column toggle */}
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
