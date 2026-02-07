import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { AuditLogEntry } from "../../types/audit-log";

const actionBadgeClasses: Record<string, string> = {
  Created: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Updated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  CheckedOut:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  CheckedIn:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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
      const date = new Date(row.getValue("timestamp") as string);
      return date.toLocaleString();
    },
  },
  {
    accessorKey: "actorName",
    header: "Actor",
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      const colorClass = actionBadgeClasses[action];
      return colorClass ? (
        <Badge className={`${colorClass} border-transparent`}>{action}</Badge>
      ) : (
        <Badge variant="outline">{action}</Badge>
      );
    },
  },
  {
    accessorKey: "entityType",
    header: "Entity Type",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.getValue("entityType") as string}
      </Badge>
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

      if (entityType === "Asset") {
        return (
          <Link
            to={`/assets/${entityId}`}
            className="font-medium text-primary hover:underline"
          >
            {displayText}
          </Link>
        );
      }
      return (
        <span className="text-foreground">
          {displayText}
        </span>
      );
    },
  },
  {
    accessorKey: "source",
    header: "Source",
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const details = row.getValue("details") as string | null;
      if (!details) return "—";
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[300px] truncate block cursor-default">
                {details}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <p>{details}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];
