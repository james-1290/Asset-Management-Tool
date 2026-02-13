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
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search asset types…"
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
