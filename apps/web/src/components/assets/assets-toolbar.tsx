import { Filter } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { Asset } from "../../types/asset";
import type { AssetType } from "../../types/asset-type";
import { ColumnToggle } from "../column-toggle";

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
}

const STATUS_OPTIONS = [
  { value: "Available", label: "Available" },
  { value: "Assigned", label: "Assigned" },
  { value: "CheckedOut", label: "Checked Out" },
  { value: "InMaintenance", label: "In Maintenance" },
] as const;

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
}: AssetsToolbarProps) {
  const activeFilterCount =
    (status ? 1 : 0) + (includeRetired ? 1 : 0) + (includeSold ? 1 : 0) + (typeId ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search assets…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Filter className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              <Select value={typeId || "__all__"} onValueChange={(v) => onTypeIdChange(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  {assetTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <Select value={status || "all"} onValueChange={onStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Include</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-retired"
                  checked={includeRetired}
                  onCheckedChange={(v) => onIncludeRetiredChange(v === true)}
                />
                <label htmlFor="include-retired" className="text-sm cursor-pointer">
                  Retired
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-sold"
                  checked={includeSold}
                  onCheckedChange={(v) => onIncludeSoldChange(v === true)}
                />
                <label htmlFor="include-sold" className="text-sm cursor-pointer">
                  Sold
                </label>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <ColumnToggle table={table} />
    </div>
  );
}
