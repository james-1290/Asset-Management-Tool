import { HistoryTimeline, type HistoryEventConfig } from "../shared/history-timeline";
import type { ApplicationHistory } from "../../types/application-history";

const eventConfig: HistoryEventConfig = {
  Created: { color: "bg-green-500", label: "Created" },
  Edited: { color: "bg-blue-500", label: "Edited" },
  Renewed: { color: "bg-teal-500", label: "Renewed" },
  Suspended: { color: "bg-gray-500", label: "Suspended" },
  Archived: { color: "bg-red-500", label: "Archived" },
  Restored: { color: "bg-green-500", label: "Restored" },
};

export function ApplicationHistoryTimeline({
  history,
  isLoading,
}: {
  history: ApplicationHistory[] | undefined;
  isLoading: boolean;
}) {
  return <HistoryTimeline history={history} isLoading={isLoading} eventConfig={eventConfig} />;
}
