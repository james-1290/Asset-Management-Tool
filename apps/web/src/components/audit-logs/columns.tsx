import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowUpDown, Info } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { AuditLogEntry } from "../../types/audit-log";

const actionBadgeClasses: Record<string, string> = {
  Created: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Archived: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Restored: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CheckedOut: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CheckedIn: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Login: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return { date, time };
}

const ENTITY_LINK_PREFIX: Record<string, string> = {
  Asset: "/assets/",
  Certificate: "/certificates/",
  Application: "/applications/",
  Person: "/people/",
  Location: "/locations/",
};

export const auditLogColumns: ColumnDef<AuditLogEntry, unknown>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Timestamp
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { date, time } = formatTimestamp(row.getValue("timestamp") as string);
      return (
        <div className="whitespace-nowrap">
          <div className="text-sm text-foreground">{date}</div>
          <div className="text-xs text-muted-foreground">{time}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "actorName",
    header: "Actor",
    cell: ({ row }) => {
      const name = row.getValue("actorName") as string;
      const initials = getInitials(name);
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
            {initials}
          </div>
          <span className="text-sm font-medium">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      const colorClass = actionBadgeClasses[action] ?? "bg-muted text-muted-foreground";
      return (
        <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded ${colorClass}`}>
          {action}
        </span>
      );
    },
  },
  {
    accessorKey: "entityType",
    header: "Entity Type",
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {row.getValue("entityType") as string}
      </span>
    ),
  },
  {
    accessorKey: "entityName",
    header: "Entity",
    cell: ({ row }) => {
      const entityType = row.original.entityType;
      const entityId = row.original.entityId;
      const entityName = row.original.entityName;
      const displayText = entityName ?? `${entityId.substring(0, 8)}...`;
      const linkPrefix = ENTITY_LINK_PREFIX[entityType];

      if (linkPrefix) {
        return (
          <Link
            to={`${linkPrefix}${entityId}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {displayText}
          </Link>
        );
      }
      return <span className="text-sm font-medium">{displayText}</span>;
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {row.getValue("source") as string}
      </span>
    ),
  },
  {
    accessorKey: "details",
    header: () => <span className="sr-only">Details</span>,
    cell: ({ row }) => {
      const details = row.getValue("details") as string | null;
      if (!details) return null;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <p className="text-sm">{details}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];
