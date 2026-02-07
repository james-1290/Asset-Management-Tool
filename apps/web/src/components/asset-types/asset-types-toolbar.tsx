import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import type { AssetType } from "../../types/asset-type";

interface AssetTypesToolbarProps {
  table: Table<AssetType>;
  search: string;
  onSearchChange: (value: string) => void;
}

export function AssetTypesToolbar({
  table,
  search,
  onSearchChange,
}: AssetTypesToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search asset types…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <ColumnToggle table={table} />
    </div>
  );
}
