import { Filter } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ColumnToggle } from "../column-toggle";
import type { Application } from "../../types/application";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "PendingRenewal", label: "Pending Renewal" },
  { value: "Suspended", label: "Suspended" },
] as const;

interface ApplicationsToolbarProps {
  table: Table<Application>;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  includeInactive: boolean;
  onIncludeInactiveChange: (value: boolean) => void;
}

export function ApplicationsToolbar({
  table,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  includeInactive,
  onIncludeInactiveChange,
}: ApplicationsToolbarProps) {
  const activeFilterCount =
    (statusFilter ? 1 : 0) + (includeInactive ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search applications…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Filter className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <Select
                value={statusFilter || "__all__"}
                onValueChange={(v) => onStatusFilterChange(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Include</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-inactive"
                  checked={includeInactive}
                  onCheckedChange={(v) => onIncludeInactiveChange(v === true)}
                />
                <label htmlFor="include-inactive" className="text-sm cursor-pointer">
                  Inactive
                </label>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <ColumnToggle table={table} />
    </div>
  );
}
