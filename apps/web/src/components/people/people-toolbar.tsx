import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import type { Person } from "../../types/person";

interface PeopleToolbarProps {
  table: Table<Person>;
  search: string;
  onSearchChange: (value: string) => void;
}

export function PeopleToolbar({
  table,
  search,
  onSearchChange,
}: PeopleToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search people…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
