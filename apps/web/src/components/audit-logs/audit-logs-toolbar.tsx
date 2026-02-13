import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
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
}

export function AuditLogsToolbar({
  table,
  search,
  onSearchChange,
  entityType,
  onEntityTypeChange,
  action,
  onActionChange,
}: AuditLogsToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search audit logs…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
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
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
