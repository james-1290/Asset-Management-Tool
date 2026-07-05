import { StatusBadge, type StatusStyle } from "../ui/status-badge";
import type { CertificateStatus } from "../../types/certificate";

const statusConfig: Record<CertificateStatus, StatusStyle> = {
  Active: {
    label: "Active",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  Expired: {
    label: "Expired",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  Revoked: {
    label: "Revoked",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  PendingRenewal: {
    label: "Pending Renewal",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
};

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  return <StatusBadge status={status} config={statusConfig} fallback="Active" />;
}
