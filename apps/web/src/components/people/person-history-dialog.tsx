import { HistoryDialog } from "../shared/history-dialog";
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
    <HistoryDialog open={open} onOpenChange={onOpenChange} title={personName}>
      <PersonHistoryTimeline history={history} isLoading={isLoading} />
    </HistoryDialog>
  );
}
