import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, AppWindow } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ApplicationStatusBadge } from "./application-status-badge";
import { AvatarPlaceholder } from "../avatar-placeholder";
import type { Application } from "../../types/application";

interface ColumnActions {
  onEdit: (application: Application) => void;
  onArchive: (application: Application) => void;
  onDeactivate?: (application: Application) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getApplicationColumns({
  onEdit,
  onArchive,
  onDeactivate,
}: ColumnActions): ColumnDef<Application, unknown>[] {
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            <AppWindow className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/applications/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {row.original.name}
            </Link>
            {row.original.licenceKey && (
              <div className="text-xs text-muted-foreground truncate">
                {row.original.licenceKey}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "applicationTypeName",
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
      accessorKey: "publisher",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 uppercase tracking-wider text-xs font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Publisher
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.publisher || "—",
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
        <ApplicationStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const application = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(application)}>
                Edit
              </DropdownMenuItem>
              {onDeactivate && application.status !== "Inactive" && !application.isArchived && (
                <DropdownMenuItem onClick={() => onDeactivate(application)}>
                  Deactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(application)}
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
