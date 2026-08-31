import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "../sortable-header";
import { Link } from "react-router-dom";
import { MoreVertical } from "lucide-react";
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
import { formatCustomFieldValue, formatCurrency as fmtCurrency } from "../../lib/format";

interface ColumnActions {
  /** Whether the viewer may change records; read-only users get no actions. */
  canWrite?: boolean;
  onEdit: (asset: Asset) => void;
  onArchive: (asset: Asset) => void;
  /** Shown instead of Edit/Delete on an archived row. */
  onRestore?: (asset: Asset) => void;
  customFieldDefinitions?: CustomFieldDefinition[];
}

function formatCurrency(amount: number): string {
  return fmtCurrency(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getAssetColumns({
  onEdit,
  onArchive,
  onRestore,
  customFieldDefinitions = [],
  canWrite = true,
}: ColumnActions): ColumnDef<Asset, unknown>[] {
  const baseColumns: ColumnDef<Asset, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} label="Asset Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <AssetTypeIcon
            typeName={row.original.assetTypeName}
            assetModelId={row.original.assetModelId}
            assetModelImageUrl={row.original.assetModelImageUrl}
          />
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
        <SortableHeader column={column} label="Financials" />
      ),
      cell: ({ row }) => {
        const cost = row.original.purchaseCost;
        if (cost == null) return <span className="text-muted-foreground">—</span>;
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
        return formatCustomFieldValue(value, def.fieldType) ?? "—";
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
            {asset.isArchived ? (
              // An archived row can only be brought back; editing or
              // deleting it again makes no sense.
              <DropdownMenuItem onClick={() => onRestore?.(asset)}>
                Restore
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => onEdit(asset)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onArchive(asset)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  // A read-only viewer gets no row-actions column at all: the API refuses the
  // write, so offering Edit or Delete only leads them into a dialog that cannot
  // be saved.
  return canWrite
    ? [...baseColumns, ...customColumns, actionsColumn]
    : [...baseColumns, ...customColumns];
}
