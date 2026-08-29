import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Certificate } from "../../types/certificate";
import type { CertificateType } from "../../types/certificate-type";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "PendingRenewal", label: "Pending Renewal" },
  { value: "Revoked", label: "Revoked" },
];

interface CertificatesToolbarProps {
  table: Table<Certificate>;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeId: string;
  onTypeIdChange: (value: string) => void;
  certificateTypes: CertificateType[];
  expiryFrom: string;
  expiryTo: string;
  onExpiryFromChange: (value: string) => void;
  onExpiryToChange: (value: string) => void;
}

export function CertificatesToolbar({
  table,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeId,
  onTypeIdChange,
  certificateTypes,
  expiryFrom,
  expiryTo,
  onExpiryFromChange,
  onExpiryToChange,
}: CertificatesToolbarProps) {
  const hasAdvancedFilters = !!(expiryFrom || expiryTo);

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search certificates..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-[240px]"
      />
      <div className="flex items-center gap-1.5">
        <FilterChip
          label="Type"
          value={typeId}
          options={certificateTypes.map((t) => ({ value: t.id, label: t.name }))}
          onChange={onTypeIdChange}
          allLabel="All types"
        />
        <FilterChip
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={onStatusFilterChange}
          allLabel="All statuses"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "gap-1 rounded-full px-3",
                hasAdvancedFilters && "border-primary/30 bg-primary/5",
              )}
            >
              <ListFilter className="h-4 w-4 shrink-0" />
              More
              {hasAdvancedFilters && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[320px] space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiry Date</label>
              <div className="flex items-center gap-2">
                <input type="date" value={expiryFrom} onChange={(e) => onExpiryFromChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
                <span className="text-xs text-muted-foreground">to</span>
                <input type="date" value={expiryTo} onChange={(e) => onExpiryToChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
