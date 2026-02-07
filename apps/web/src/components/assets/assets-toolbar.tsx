import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { Asset } from "../../types/asset";
import { ColumnToggle } from "../column-toggle";

interface AssetsToolbarProps {
  table: Table<Asset>;
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
  { value: "Retired", label: "Retired" },
  { value: "Sold", label: "Sold" },
] as const;

export function AssetsToolbar({
  table,
  search,
  onSearchChange,
  status,
  onStatusChange,
}: AssetsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search assets…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <Select value={status || "all"} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
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
