import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import { ArchivedToggle } from "../archived-toggle";

interface TypesToolbarProps<T> {
  /** Reveals archived rows so they can be restored. */
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  table: Table<T>;
  search: string;
  onSearchChange: (value: string) => void;
  /** Search-box placeholder, e.g. "Search asset types…". */
  placeholder: string;
}

/** Shared toolbar for the entity-type management pages (search + column toggle). */
export function TypesToolbar<T>({
  showArchived,
  onShowArchivedChange,
  table,
  search,
  onSearchChange,
  placeholder,
}: TypesToolbarProps<T>) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-[220px] shrink-0"
      />
      {onShowArchivedChange && (
        <ArchivedToggle
          showArchived={showArchived ?? false}
          onShowArchivedChange={onShowArchivedChange}
        />
      )}
      <ColumnToggle table={table} />
    </div>
  );
}
