import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History &mdash; {applicationName}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <ApplicationHistoryTimeline history={history} isLoading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
