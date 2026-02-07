import { Badge } from "../ui/badge";
import type { ApplicationStatus } from "../../types/application";

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  Active: {
    label: "Active",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  Expired: {
    label: "Expired",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  Suspended: {
    label: "Suspended",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  PendingRenewal: {
    label: "Pending Renewal",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.Active;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
