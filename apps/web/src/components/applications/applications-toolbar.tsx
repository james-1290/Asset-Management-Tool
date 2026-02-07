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
import type { Application } from "../../types/application";

const STATUS_OPTIONS = [
  { value: "__all__", label: "All Statuses" },
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
}

export function ApplicationsToolbar({
  table,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ApplicationsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search applications…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <Select
        value={statusFilter || "__all__"}
        onValueChange={(v) => onStatusFilterChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ColumnToggle table={table} />
    </div>
  );
}
