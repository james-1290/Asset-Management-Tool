import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { AssetTemplate } from "../../types/asset-template";
import { formatCurrency as fmtCurrency } from "../../lib/format";

interface ColumnActions {
  /**
   * Whether the viewer may change records. A read-only user gets no row
   * actions: the API refuses the write, so offering Edit or Delete only
   * leads them into a dialog that cannot be saved.
   */
  canWrite?: boolean;
  onEdit: (template: AssetTemplate) => void;
  onArchive: (template: AssetTemplate) => void;
  /** Shown instead of Edit/Delete on an archived row. */
  onRestore?: (template: AssetTemplate) => void;
}

function formatCurrency(value: number | null): string {
  return fmtCurrency(value, { fallback: "—" });
}

export function getAssetTemplateColumns({
  canWrite = true,
  onEdit,
  onArchive,
  onRestore,
}: ColumnActions): ColumnDef<AssetTemplate, unknown>[] {
  const columns: ColumnDef<AssetTemplate, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
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
      accessorKey: "assetTypeName",
      header: "Asset Type",
    },
    {
      accessorKey: "purchaseCost",
      header: "Default Cost",
      cell: ({ row }) => formatCurrency(row.original.purchaseCost),
    },
    {
      accessorKey: "locationName",
      header: "Default Location",
      cell: ({ row }) => row.original.locationName ?? "—",
    },
    {
      accessorKey: "depreciationMonths",
      header: "Depreciation",
      cell: ({ row }) =>
        row.original.depreciationMonths
          ? `${row.original.depreciationMonths} months`
          : "—",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const template = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {template.isArchived ? (
                // An archived row can only be brought back; editing or
                // deleting it again makes no sense.
                <DropdownMenuItem onClick={() => onRestore?.(template)}>
                  Restore
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onArchive(template)}
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
