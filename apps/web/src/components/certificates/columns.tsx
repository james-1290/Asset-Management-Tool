import { Link } from "react-router-dom";
import { SortableHeader } from "../sortable-header";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CertificateStatusBadge } from "./certificate-status-badge";
import { AvatarPlaceholder } from "../avatar-placeholder";
import { ExpiryDateCell } from "../expiry-date-cell";
import type { Certificate } from "../../types/certificate";

interface ColumnActions {
  /**
   * Whether the viewer may change records. A read-only user gets no row
   * actions: the API refuses the write, so offering Edit or Delete only
   * leads them into a dialog that cannot be saved.
   */
  canWrite?: boolean;
  onEdit: (certificate: Certificate) => void;
  onArchive: (certificate: Certificate) => void;
}

export function getCertificateColumns({
  canWrite = true,
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<Certificate, unknown>[] {
  const columns: ColumnDef<Certificate, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} label="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/certificates/${row.original.id}`}
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
      accessorKey: "certificateTypeName",
      header: ({ column }) => (
        <SortableHeader column={column} label="Type" />
      ),
    },
    {
      accessorKey: "issuer",
      header: ({ column }) => (
        <SortableHeader column={column} label="Issuer" />
      ),
      cell: ({ row }) => row.original.issuer || "—",
    },
    {
      accessorKey: "personName",
      header: "Assigned To",
      cell: ({ row }) => {
        const name = row.original.personName;
        return (
          <div className="flex items-center gap-2">
            <AvatarPlaceholder name={name} />
            {name && <span className="text-sm">{name}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "expiryDate",
      header: ({ column }) => (
        <SortableHeader column={column} label="Expiry Date" />
      ),
      cell: ({ row }) => <ExpiryDateCell value={row.original.expiryDate} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} label="Status" />
      ),
      cell: ({ row }) => (
        <CertificateStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const certificate = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(certificate)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(certificate)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // A read-only viewer gets no row-actions column at all.
  return canWrite ? columns : columns.filter((c) => c.id !== "actions");
}
