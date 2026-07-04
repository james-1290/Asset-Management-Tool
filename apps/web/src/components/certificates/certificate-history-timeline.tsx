import { HistoryTimeline, type HistoryEventConfig } from "../shared/history-timeline";
import type { CertificateHistory } from "../../types/certificate-history";

const eventConfig: HistoryEventConfig = {
  Created: { color: "bg-green-500", label: "Created" },
  Edited: { color: "bg-blue-500", label: "Edited" },
  Renewed: { color: "bg-teal-500", label: "Renewed" },
  Revoked: { color: "bg-gray-500", label: "Revoked" },
  Archived: { color: "bg-red-500", label: "Archived" },
  Restored: { color: "bg-green-500", label: "Restored" },
};

export function CertificateHistoryTimeline({
  history,
  isLoading,
}: {
  history: CertificateHistory[] | undefined;
  isLoading: boolean;
}) {
  return <HistoryTimeline history={history} isLoading={isLoading} eventConfig={eventConfig} />;
}
