import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

/** Minimal shape shared by all entity-type rows (asset/certificate/application). */
export interface TypeRow {
  id: string;
  name: string;
  description: string | null;
  customFields?: unknown[] | null;
}

interface TypeColumnActions<T> {
  onEdit: (row: T) => void;
  onArchive: (row: T) => void;
}

/** Shared columns (name / description / custom-field count / actions) for the
 *  entity-type management tables. */
export function getTypeColumns<T extends TypeRow>({
  onEdit,
  onArchive,
}: TypeColumnActions<T>): ColumnDef<T, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 text-xs font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onEdit(row.original)}
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[400px] block">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      id: "customFields",
      header: "Custom Fields",
      cell: ({ row }) => {
        const count = row.original.customFields?.length ?? 0;
        return (
          <span className="text-muted-foreground">
            {count === 0 ? "—" : `${count} field${count !== 1 ? "s" : ""}`}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const type = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(type)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(type)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
