import { HistoryDialog } from "../shared/history-dialog";
import { ApplicationHistoryTimeline } from "./application-history-timeline";
import { useApplicationHistory } from "../../hooks/use-applications";

interface ApplicationHistoryDialogProps {
  applicationId: string;
  applicationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationHistoryDialog({
  applicationId,
  applicationName,
  open,
  onOpenChange,
}: ApplicationHistoryDialogProps) {
  const { data: history, isLoading } = useApplicationHistory(applicationId);
  return (
    <HistoryDialog open={open} onOpenChange={onOpenChange} title={applicationName}>
      <ApplicationHistoryTimeline history={history} isLoading={isLoading} />
    </HistoryDialog>
  );
}
