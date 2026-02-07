import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { AuditLogEntry } from "../../types/audit-log";

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
    cell: ({ row }) => <Badge variant="outline">{row.getValue("action") as string}</Badge>,
  },
  {
    accessorKey: "entityType",
    header: "Entity Type",
    cell: ({ row }) => <Badge variant="secondary">{row.getValue("entityType") as string}</Badge>,
  },
  {
    accessorKey: "entityId",
    header: "Entity ID",
    cell: ({ row }) => {
      const entityType = row.original.entityType;
      const entityId = row.original.entityId;
      if (entityType === "Asset") {
        return (
          <Link
            to={`/assets/${entityId}`}
            className="font-medium text-primary hover:underline"
          >
            {entityId.substring(0, 8)}...
          </Link>
        );
      }
      return <span className="text-muted-foreground">{entityId.substring(0, 8)}...</span>;
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
      return <span className="max-w-[300px] truncate block">{details}</span>;
    },
  },
];
