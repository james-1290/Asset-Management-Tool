import { StatusBadge, type StatusStyle } from "../ui/status-badge";
import type { AssetStatus } from "../../types/asset";

const statusConfig: Record<AssetStatus, StatusStyle> = {
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

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <StatusBadge status={status} config={statusConfig} fallback="Available" />;
}
