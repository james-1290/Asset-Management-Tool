import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import { FilterChip } from "../filter-chip";
import type { Certificate } from "../../types/certificate";
import type { CertificateType } from "../../types/certificate-type";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "PendingRenewal", label: "Pending Renewal" },
  { value: "Revoked", label: "Revoked" },
] as const;

interface CertificatesToolbarProps {
  table: Table<Certificate>;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeId: string;
  onTypeIdChange: (value: string) => void;
  certificateTypes: CertificateType[];
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
}: CertificatesToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder="Search certificates…"
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
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={onStatusFilterChange}
          allLabel="All statuses"
        />
      </div>
      <div className="ml-auto">
        <ColumnToggle table={table} />
      </div>
    </div>
  );
}
