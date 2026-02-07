import { useSearchParams } from "react-router-dom";
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

interface AssetsToolbarProps {
  table: Table<Asset>;
}

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
  { value: "Retired", label: "Retired" },
  { value: "Sold", label: "Sold" },
] as const;

export function AssetsToolbar({ table }: AssetsToolbarProps) {
  const [, setSearchParams] = useSearchParams();
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? "";

  function handleStatusChange(value: string) {
    if (value === "all") {
      table.getColumn("status")?.setFilterValue(undefined);
      setSearchParams((prev) => {
        prev.delete("status");
        return prev;
      });
    } else {
      table.getColumn("status")?.setFilterValue(value);
      setSearchParams((prev) => {
        prev.set("status", value);
        return prev;
      });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Filter by name…"
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}
        className="max-w-sm"
      />
      <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
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
    </div>
  );
}
