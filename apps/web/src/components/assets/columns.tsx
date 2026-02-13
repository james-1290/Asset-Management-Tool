import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
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
import type { CustomFieldDefinition } from "../../types/custom-field";

interface ColumnActions {
  onEdit: (asset: Asset) => void;
  onArchive: (asset: Asset) => void;
  customFieldDefinitions?: CustomFieldDefinition[];
}

function formatCustomFieldValue(
  value: string | null | undefined,
  fieldType: string
): string {
  if (!value) return "—";
  switch (fieldType) {
    case "Boolean":
      return value === "true" ? "Yes" : "No";
    case "Date":
      return new Date(value).toLocaleDateString();
    case "MultiSelect": {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) return arr.join(", ");
      } catch {
        // fall through
      }
      return value;
    }
    default:
      return value;
  }
}

export function getAssetColumns({
  onEdit,
  onArchive,
  customFieldDefinitions = [],
}: ColumnActions): ColumnDef<Asset, unknown>[] {
  const baseColumns: ColumnDef<Asset, unknown>[] = [
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
        <Link
          to={`/assets/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "serialNumber",
      header: "Serial Number",
      cell: ({ row }) => row.getValue("serialNumber") || "—",
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
      accessorKey: "assignedPersonName",
      header: "Assigned To",
      cell: ({ row }) => row.getValue("assignedPersonName") || "—",
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
  ];

  // Dynamic custom field columns
  const customColumns: ColumnDef<Asset, unknown>[] = customFieldDefinitions.map(
    (def) => ({
      id: `cf_${def.id}`,
      header: def.name,
      enableHiding: true,
      accessorFn: (row: Asset) => {
        const cfv = row.customFieldValues?.find(
          (v) => v.fieldDefinitionId === def.id
        );
        return cfv?.value ?? null;
      },
      cell: ({ getValue }) => {
        const value = getValue() as string | null;
        return formatCustomFieldValue(value, def.fieldType);
      },
    })
  );

  const actionsColumn: ColumnDef<Asset, unknown> = {
    id: "actions",
    enableHiding: false,
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
  };

  return [...baseColumns, ...customColumns, actionsColumn];
}
