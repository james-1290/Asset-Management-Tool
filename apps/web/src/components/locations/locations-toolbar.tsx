import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import type { Location } from "../../types/location";

interface LocationsToolbarProps {
  table: Table<Location>;
}

export function LocationsToolbar({ table }: LocationsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Filter by name…"
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}
        className="max-w-sm"
      />
    </div>
  );
}
