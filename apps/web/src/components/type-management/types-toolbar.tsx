import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";

interface TypesToolbarProps<T> {
  table: Table<T>;
  search: string;
  onSearchChange: (value: string) => void;
  /** Search-box placeholder, e.g. "Search asset types…". */
  placeholder: string;
}

/** Shared toolbar for the entity-type management pages (search + column toggle). */
export function TypesToolbar<T>({
  table,
  search,
  onSearchChange,
  placeholder,
}: TypesToolbarProps<T>) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder={placeholder}
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
