import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { AuditLogEntry } from "../../types/audit-log";

interface AuditLogsToolbarProps {
  table: Table<AuditLogEntry>;
}

const entityTypes = ["Asset", "Location", "AssetType", "Person"];
const actions = ["Created", "Updated", "Archived", "CheckedOut", "CheckedIn"];

export function AuditLogsToolbar({ table }: AuditLogsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Filter by details..."
        value={(table.getColumn("details")?.getFilterValue() as string) ?? ""}
        onChange={(e) =>
          table.getColumn("details")?.setFilterValue(e.target.value)
        }
        className="max-w-sm"
      />
      <Select
        value={
          (table.getColumn("entityType")?.getFilterValue() as string) ?? "all"
        }
        onValueChange={(value) =>
          table
            .getColumn("entityType")
            ?.setFilterValue(value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Entity Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {entityTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={
          (table.getColumn("action")?.getFilterValue() as string) ?? "all"
        }
        onValueChange={(value) =>
          table
            .getColumn("action")
            ?.setFilterValue(value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {actions.map((action) => (
            <SelectItem key={action} value={action}>
              {action}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
