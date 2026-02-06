import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AssetStatusBadge } from "./asset-status-badge";
import type { Asset } from "../../types/asset";

interface ColumnActions {
  onEdit: (asset: Asset) => void;
  onArchive: (asset: Asset) => void;
}

export function getAssetColumns({
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<Asset, unknown>[] {
  return [
    {
      accessorKey: "assetTag",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Asset Tag
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
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
    },
    {
      accessorKey: "assetTypeName",
      header: "Type",
    },
    {
      accessorKey: "locationName",
      header: "Location",
      cell: ({ row }) => row.getValue("locationName") || "—",
    },
    {
      accessorKey: "assignedUserName",
      header: "Assigned To",
      cell: ({ row }) => row.getValue("assignedUserName") || "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <AssetStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "warrantyExpiryDate",
      header: "Warranty Expiry",
      cell: ({ row }) => {
        const date = row.getValue("warrantyExpiryDate") as string | null;
        if (!date) return "—";
        return new Date(date).toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(asset)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(asset)}
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
