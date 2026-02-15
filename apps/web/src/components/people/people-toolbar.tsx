import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import type { Person } from "../../types/person";
import type { Location } from "../../types/location";

interface PeopleToolbarProps {
  table: Table<Person>;
  search: string;
  onSearchChange: (value: string) => void;
  locationId: string;
  onLocationIdChange: (value: string) => void;
  locations: Location[];
  department: string;
  onDepartmentChange: (value: string) => void;
  departments: string[];
}

export function PeopleToolbar({
  table,
  search,
  onSearchChange,
  locationId,
  onLocationIdChange,
  locations,
  department,
  onDepartmentChange,
  departments,
}: PeopleToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search people..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="flex items-center gap-1.5">
        <FilterChip
          label="Location"
          value={locationId}
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
          onChange={onLocationIdChange}
          allLabel="All locations"
        />
        <FilterChip
          label="Department"
          value={department}
          options={departments.map((d) => ({ value: d, label: d }))}
          onChange={onDepartmentChange}
          allLabel="All departments"
        />
      </div>
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
