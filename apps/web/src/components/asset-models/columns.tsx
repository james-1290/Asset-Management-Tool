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
  /**
   * Whether the viewer may change records. A read-only user gets no row
   * actions: the API refuses the write, so offering Edit or Delete only
   * leads them into a dialog that cannot be saved.
   */
  canWrite?: boolean;
  onEdit: (model: AssetModel) => void;
  onArchive: (model: AssetModel) => void;
  /** Shown instead of Edit/Delete on an archived row. */
  onRestore?: (model: AssetModel) => void;
}

export function getAssetModelColumns({
  canWrite = true,
  onEdit,
  onArchive,
  onRestore,
}: ColumnActions): ColumnDef<AssetModel, unknown>[] {
  const columns: ColumnDef<AssetModel, unknown>[] = [
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
              {model.isArchived ? (
                // An archived row can only be brought back; editing or
                // deleting it again makes no sense.
                <DropdownMenuItem onClick={() => onRestore?.(model)}>
                  Restore
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onEdit(model)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onArchive(model)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // A read-only viewer gets no row-actions column at all.
  return canWrite ? columns : columns.filter((c) => c.id !== "actions");
}
