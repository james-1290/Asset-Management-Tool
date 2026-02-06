import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import type { Asset } from "../../types/asset";

interface AssetsToolbarProps {
  table: Table<Asset>;
}

export function AssetsToolbar({ table }: AssetsToolbarProps) {
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
