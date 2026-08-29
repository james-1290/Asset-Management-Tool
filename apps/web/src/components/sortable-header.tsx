import type { Column } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "./ui/button";

/**
 * The standard sortable column header used across every DataTable: a ghost
 * button that toggles the column's sort direction, with a sort icon. Extracted
 * so all list tables share one implementation (previously ~16 hand-written
 * copies, with the icon size drifting between tables).
 */
export function SortableHeader<T>({
  column,
  label,
}: {
  column: Column<T, unknown>;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      className="-ml-4 text-xs font-medium"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}
