import type { AssetStatus } from "../../types/asset";

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  Available: {
    label: "Available",
    className: "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400",
  },
  Assigned: {
    label: "Deployed",
    className: "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400",
  },
  CheckedOut: {
    label: "Checked Out",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:text-blue-400",
  },
  InMaintenance: {
    label: "In Repair",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400",
  },
  Retired: {
    label: "Retired",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  Sold: {
    label: "Sold",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  Archived: {
    label: "Archived",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

interface AssetStatusBadgeProps {
  status: AssetStatus;
}

export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.Available;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
