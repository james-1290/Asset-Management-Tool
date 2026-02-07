import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { CertificateHistoryTimeline } from "./certificate-history-timeline";
import { useCertificateHistory } from "../../hooks/use-certificates";

interface CertificateHistoryDialogProps {
  certificateId: string;
  certificateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificateHistoryDialog({
  certificateId,
  certificateName,
  open,
  onOpenChange,
}: CertificateHistoryDialogProps) {
  const { data: history, isLoading } = useCertificateHistory(certificateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History &mdash; {certificateName}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <CertificateHistoryTimeline history={history} isLoading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
