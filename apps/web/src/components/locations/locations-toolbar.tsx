import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import type { Location } from "../../types/location";

interface LocationsToolbarProps {
  table: Table<Location>;
  search: string;
  onSearchChange: (value: string) => void;
}

export function LocationsToolbar({
  table,
  search,
  onSearchChange,
}: LocationsToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search locations…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
