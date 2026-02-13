import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { FilterChip } from "../filter-chip";
import { ColumnToggle } from "../column-toggle";
import { Checkbox } from "../ui/checkbox";
import type { Asset } from "../../types/asset";
import type { AssetType } from "../../types/asset-type";
import type { Location } from "../../types/location";

interface AssetsToolbarProps {
  table: Table<Asset>;
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  includeRetired: boolean;
  onIncludeRetiredChange: (value: boolean) => void;
  includeSold: boolean;
  onIncludeSoldChange: (value: boolean) => void;
  typeId: string;
  onTypeIdChange: (value: string) => void;
  assetTypes: AssetType[];
  locationId?: string;
  onLocationIdChange?: (value: string) => void;
  locations?: Location[];
}

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
];

export function AssetsToolbar({
  table,
  search,
  onSearchChange,
  status,
  onStatusChange,
  includeRetired,
  onIncludeRetiredChange,
  includeSold,
  onIncludeSoldChange,
  typeId,
  onTypeIdChange,
  assetTypes,
  locationId,
  onLocationIdChange,
  locations,
}: AssetsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search assets…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="flex items-center gap-1.5">
        <FilterChip
          label="Type"
          value={typeId}
          options={assetTypes.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => onTypeIdChange(v)}
          allLabel="All types"
        />
        <FilterChip
          label="Status"
          value={status === "all" ? "" : status}
          options={STATUS_OPTIONS}
          onChange={(v) => onStatusChange(v || "all")}
          allLabel="All statuses"
        />
        {locations && locations.length > 0 && onLocationIdChange && (
          <FilterChip
            label="Location"
            value={locationId ?? ""}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            onChange={onLocationIdChange}
            allLabel="All locations"
          />
        )}
        <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-border">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
            <Checkbox
              checked={includeRetired}
              onCheckedChange={(v) => onIncludeRetiredChange(v === true)}
              className="h-3.5 w-3.5"
            />
            Retired
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
            <Checkbox
              checked={includeSold}
              onCheckedChange={(v) => onIncludeSoldChange(v === true)}
              className="h-3.5 w-3.5"
            />
            Sold
          </label>
        </div>
      </div>
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
