import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import { DateRangeFilter } from "../filters/date-range-filter";
import { QuickFilterBar } from "../filters/quick-filter-bar";
import type { QuickFilter } from "../filters/quick-filter-bar";
import type { Certificate } from "../../types/certificate";
import type { CertificateType } from "../../types/certificate-type";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function plus30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

const CERT_QUICK_FILTERS: QuickFilter[] = [
  { id: "expiring-soon", label: "Expiring Soon", params: { expiryFrom: todayISO(), expiryTo: plus30DaysISO() } },
  { id: "expired", label: "Expired", params: { status: "Expired" } },
  { id: "pending-renewal", label: "Pending Renewal", params: { status: "PendingRenewal" } },
];

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
  quickFilter: string;
  onQuickFilterApply: (filter: QuickFilter) => void;
  onQuickFilterClear: () => void;
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
  quickFilter,
  onQuickFilterApply,
  onQuickFilterClear,
}: CertificatesToolbarProps) {
  return (
    <div className="space-y-2">
      <QuickFilterBar
        filters={CERT_QUICK_FILTERS}
        activeFilterId={quickFilter || null}
        onApply={onQuickFilterApply}
        onClear={onQuickFilterClear}
      />
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search certificates..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-[240px]"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
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
          <DateRangeFilter
            label="Expiry"
            fromValue={expiryFrom}
            toValue={expiryTo}
            onFromChange={onExpiryFromChange}
            onToChange={onExpiryToChange}
          />
        </div>
        <div className="ml-auto">
          <ColumnToggle table={table} />
        </div>
      </div>
    </div>
  );
}
