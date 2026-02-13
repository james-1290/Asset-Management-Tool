import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import type { Application } from "../../types/application";
import type { ApplicationType } from "../../types/application-type";

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
  typeId: string;
  onTypeIdChange: (value: string) => void;
  applicationTypes: ApplicationType[];
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
}: ApplicationsToolbarProps) {
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
