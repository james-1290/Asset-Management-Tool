/* eslint-disable react-refresh/only-export-components */
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowUpDown, MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AssetStatusBadge } from "./asset-status-badge";
import { AssetTypeIcon } from "./asset-type-icon";
import { AvatarPlaceholder } from "../avatar-placeholder";
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
  if (!value) return "\u2014";
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Asset Name
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <AssetTypeIcon typeName={row.original.assetTypeName} />
          <div className="min-w-0">
            <Link
              to={`/assets/${row.original.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {row.original.name}
            </Link>
            {row.original.serialNumber && (
              <div className="text-xs text-muted-foreground truncate">
                ID: #{row.original.serialNumber}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "assetTypeName",
      header: "Type",
    },
    {
      accessorKey: "assignedPersonName",
      header: "Assigned To",
      cell: ({ row }) => {
        const name = row.original.assignedPersonName;
        if (!name) {
          return (
            <span className="text-sm text-muted-foreground italic">Unassigned</span>
          );
        }
        return (
          <div className="flex items-center gap-2.5">
            <AvatarPlaceholder name={name} size="md" />
            <span className="text-sm font-medium">{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <AssetStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "purchaseCost",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Financials
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const cost = row.original.purchaseCost;
        if (cost == null) return <span className="text-muted-foreground">\u2014</span>;
        const bookValue = row.original.bookValue ?? cost;
        return (
          <div>
            <span className="font-semibold tabular-nums">{formatCurrency(cost)}</span>
            <div className="text-xs text-muted-foreground tabular-nums">
              BV: {formatCurrency(bookValue)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "locationName",
      header: "Location",
      cell: ({ row }) => row.getValue("locationName") || <span className="text-muted-foreground">\u2014</span>,
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
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const value = getValue() as string | null;
        return formatCustomFieldValue(value, def.fieldType);
      },
    })
  );

  const actionsColumn: ColumnDef<Asset, unknown> = {
    id: "actions",
    header: "Action",
    enableHiding: false,
    cell: ({ row }) => {
      const asset = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
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
