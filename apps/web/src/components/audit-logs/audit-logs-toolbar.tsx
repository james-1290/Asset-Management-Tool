import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ColumnToggle } from "../column-toggle";
import type { AuditLogEntry } from "../../types/audit-log";

interface AuditLogsToolbarProps {
  table: Table<AuditLogEntry>;
  search: string;
  onSearchChange: (value: string) => void;
  entityType: string;
  onEntityTypeChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
}

const entityTypes = ["Asset", "Location", "AssetType", "Person"];
const actions = ["Created", "Updated", "Archived", "CheckedOut", "CheckedIn"];

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
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search audit logs…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <Select value={entityType || "all"} onValueChange={onEntityTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Entity Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {entityTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={action || "all"} onValueChange={onActionChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {actions.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ColumnToggle table={table} />
    </div>
  );
}
