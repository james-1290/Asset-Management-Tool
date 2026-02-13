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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function DepreciationBadge({ asset }: { asset: Asset }) {
  if (asset.purchaseCost == null || asset.purchaseCost === 0) return <span className="text-muted-foreground">—</span>;

  const bookValue = asset.bookValue ?? asset.purchaseCost;
  const pct = Math.round((bookValue / asset.purchaseCost) * 100);

  let colorClass: string;
  if (pct > 50) {
    colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  } else if (pct > 20) {
    colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  } else {
    colorClass = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums">{formatCurrency(bookValue)}</span>
      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${colorClass}`}>
        {pct}%
      </span>
    </div>
  );
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
        <div className="flex items-center gap-3">
          <AssetTypeIcon typeName={row.original.assetTypeName} />
          <div className="min-w-0">
            <Link
              to={`/assets/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {row.original.name}
            </Link>
            {row.original.serialNumber && (
              <div className="text-xs text-muted-foreground truncate">
                {row.original.serialNumber}
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
        return (
          <div className="flex items-center gap-2">
            <AvatarPlaceholder name={name} />
            {name && <span className="text-sm">{name}</span>}
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
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Buy Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cost = row.original.purchaseCost;
        if (cost == null) return <span className="text-muted-foreground">—</span>;
        const year = row.original.purchaseDate
          ? new Date(row.original.purchaseDate).getFullYear()
          : null;
        return (
          <span className="tabular-nums">
            {formatCurrency(cost)}
            {year && (
              <span className="ml-1.5 text-xs text-muted-foreground">· {year}</span>
            )}
          </span>
        );
      },
    },
    {
      id: "depreciation",
      header: "Book Value",
      cell: ({ row }) => <DepreciationBadge asset={row.original} />,
    },
    {
      accessorKey: "locationName",
      header: "Location",
      cell: ({ row }) => row.getValue("locationName") || <span className="text-muted-foreground">—</span>,
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
