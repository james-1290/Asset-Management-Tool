import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import type { ApplicationType } from "../../types/application-type";

interface ApplicationTypesToolbarProps {
  table: Table<ApplicationType>;
  search: string;
  onSearchChange: (value: string) => void;
}

export function ApplicationTypesToolbar({
  table,
  search,
  onSearchChange,
}: ApplicationTypesToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search application types…"
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
