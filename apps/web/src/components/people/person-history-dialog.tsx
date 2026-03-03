import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PersonHistoryTimeline } from "./person-history-timeline";
import { usePersonHistory } from "../../hooks/use-people";

interface PersonHistoryDialogProps {
  personId: string;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonHistoryDialog({
  personId,
  personName,
  open,
  onOpenChange,
}: PersonHistoryDialogProps) {
  const { data: history, isLoading } = usePersonHistory(personId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History &mdash; {personName}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <PersonHistoryTimeline history={history} isLoading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
