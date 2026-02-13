import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowUpDown, MoreHorizontal, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Location } from "../../types/location";

interface ColumnActions {
  onEdit: (location: Location) => void;
  onArchive: (location: Location) => void;
}

export function getLocationColumns({
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<Location, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/locations/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {row.original.name}
            </Link>
            {row.original.city && (
              <div className="text-xs text-muted-foreground truncate">
                {row.original.city}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => row.getValue("address") || "—",
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => row.getValue("country") || "—",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const location = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(location)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(location)}
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
