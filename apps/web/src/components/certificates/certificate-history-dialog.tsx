import { HistoryDialog } from "../shared/history-dialog";
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
    <HistoryDialog open={open} onOpenChange={onOpenChange} title={certificateName}>
      <CertificateHistoryTimeline history={history} isLoading={isLoading} />
    </HistoryDialog>
  );
}
