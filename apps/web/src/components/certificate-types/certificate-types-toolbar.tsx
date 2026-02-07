import type { Table } from "@tanstack/react-table";
import { Input } from "../ui/input";
import { ColumnToggle } from "../column-toggle";
import type { CertificateType } from "../../types/certificate-type";

interface CertificateTypesToolbarProps {
  table: Table<CertificateType>;
  search: string;
  onSearchChange: (value: string) => void;
}

export function CertificateTypesToolbar({
  table,
  search,
  onSearchChange,
}: CertificateTypesToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search certificate types…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <ColumnToggle table={table} />
    </div>
  );
}
