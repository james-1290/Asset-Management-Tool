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

interface ColumnActions {
  onEdit: (template: AssetTemplate) => void;
  onArchive: (template: AssetTemplate) => void;
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function getAssetTemplateColumns({
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<AssetTemplate, unknown>[] {
  return [
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
              <DropdownMenuItem onClick={() => onEdit(template)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(template)}
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
