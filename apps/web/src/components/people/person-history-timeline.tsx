import { HistoryTimeline, type HistoryEventConfig } from "../shared/history-timeline";
import type { PersonHistory } from "../../types/person";

const eventConfig: HistoryEventConfig = {
  Created: { color: "bg-green-500", label: "Created" },
  Edited: { color: "bg-blue-500", label: "Edited" },
  Archived: { color: "bg-red-500", label: "Archived" },
  Restored: { color: "bg-green-500", label: "Restored" },
  AssetAssigned: { color: "bg-indigo-500", label: "Asset Assigned" },
  AssetUnassigned: { color: "bg-yellow-500", label: "Asset Unassigned" },
  AssetCheckedOut: { color: "bg-amber-500", label: "Asset Checked Out" },
  AssetCheckedIn: { color: "bg-teal-500", label: "Asset Checked In" },
};

export function PersonHistoryTimeline({
  history,
  isLoading,
}: {
  history: PersonHistory[] | undefined;
  isLoading: boolean;
}) {
  return <HistoryTimeline history={history} isLoading={isLoading} eventConfig={eventConfig} />;
}
