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

/** Returns "expired" | "expiring" | "normal" based on the expiry date */
function getExpiryUrgency(iso: string | null): "expired" | "expiring" | "normal" {
  if (!iso) return "normal";
  const now = Date.now();
  const expiry = new Date(iso).getTime();
  if (expiry < now) return "expired";
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (expiry - now < thirtyDays) return "expiring";
  return "normal";
}

const ICON_COLORS = [
  { bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
  { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-50 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
  { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
];

function hashColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
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
          Application Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const color = hashColor(row.original.name);
        return (
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color.bg}`}>
              <AppWindow className={`h-5 w-5 ${color.text}`} />
            </div>
            <div className="min-w-0">
              <Link
                to={`/applications/${row.original.id}`}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors"
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
        );
      },
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
            {name && <span className="text-xs font-medium">{name}</span>}
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
      cell: ({ row }) => {
        const urgency = getExpiryUrgency(row.original.expiryDate);
        const colorClass = urgency === "expired"
          ? "text-red-600 dark:text-red-400 font-medium"
          : urgency === "expiring"
            ? "text-orange-600 dark:text-orange-400 font-medium"
            : "";
        return <span className={colorClass}>{formatDate(row.original.expiryDate)}</span>;
      },
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
