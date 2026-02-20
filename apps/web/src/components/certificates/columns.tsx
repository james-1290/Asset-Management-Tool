import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CertificateStatusBadge } from "./certificate-status-badge";
import { AvatarPlaceholder } from "../avatar-placeholder";
import type { Certificate } from "../../types/certificate";

interface ColumnActions {
  onEdit: (certificate: Certificate) => void;
  onArchive: (certificate: Certificate) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getCertificateColumns({
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<Certificate, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
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
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "issuer",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Issuer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
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
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Expiry Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.expiryDate),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
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
}
