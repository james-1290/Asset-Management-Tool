import { HistoryTimeline, type HistoryEventConfig } from "../shared/history-timeline";
import type { AssetHistory } from "../../types/asset-history";

const eventConfig: HistoryEventConfig = {
  Created: { color: "bg-green-500", label: "Created" },
  Edited: { color: "bg-blue-500", label: "Edited" },
  Assigned: { color: "bg-indigo-500", label: "Assigned" },
  Unassigned: { color: "bg-yellow-500", label: "Unassigned" },
  CheckedIn: { color: "bg-teal-500", label: "Checked In" },
  CheckedOut: { color: "bg-amber-500", label: "Checked Out" },
  Retired: { color: "bg-gray-500", label: "Retired" },
  Sold: { color: "bg-gray-500", label: "Sold" },
  Archived: { color: "bg-red-500", label: "Archived" },
  Restored: { color: "bg-green-500", label: "Restored" },
};

export function AssetHistoryTimeline({
  history,
  isLoading,
}: {
  history: AssetHistory[] | undefined;
  isLoading: boolean;
}) {
  return <HistoryTimeline history={history} isLoading={isLoading} eventConfig={eventConfig} />;
}
