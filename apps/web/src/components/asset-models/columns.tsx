import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ModelImageCell } from "./model-image-cell";
import type { AssetModel } from "../../types/asset-model";

interface ColumnActions {
  onEdit: (model: AssetModel) => void;
  onArchive: (model: AssetModel) => void;
}

export function getAssetModelColumns({
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<AssetModel, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <ModelImageCell model={row.original} />
          <button
            type="button"
            onClick={() => onEdit(row.original)}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {row.original.name}
          </button>
        </div>
      ),
    },
    {
      accessorKey: "manufacturer",
      header: "Manufacturer",
      cell: ({ row }) => row.original.manufacturer ?? "—",
    },
    {
      accessorKey: "assetTypeName",
      header: "Asset Type",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const model = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(model)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(model)}
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
