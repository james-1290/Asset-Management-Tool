import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import type { Person } from "../../types/person";

interface PeopleToolbarProps {
  table: Table<Person>;
}

export function PeopleToolbar({ table }: PeopleToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Filter by name…"
        value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
        onChange={(e) =>
          table.getColumn("fullName")?.setFilterValue(e.target.value)
        }
        className="max-w-sm"
      />
    </div>
  );
}
