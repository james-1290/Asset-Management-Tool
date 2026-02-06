import { Badge } from "../ui/badge";
import type { AssetStatus } from "../../types/asset";

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  Available: {
    label: "Available",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  Assigned: {
    label: "Assigned",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  CheckedOut: {
    label: "Checked Out",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  InMaintenance: {
    label: "In Maintenance",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  Retired: {
    label: "Retired",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  Sold: {
    label: "Sold",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  Archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
};

interface AssetStatusBadgeProps {
  status: AssetStatus;
}

export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.Available;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
