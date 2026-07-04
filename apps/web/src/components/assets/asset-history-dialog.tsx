import { HistoryDialog } from "../shared/history-dialog";
import { AssetHistoryTimeline } from "./asset-history-timeline";
import { useAssetHistory } from "../../hooks/use-assets";

interface AssetHistoryDialogProps {
  assetId: string;
  assetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetHistoryDialog({
  assetId,
  assetName,
  open,
  onOpenChange,
}: AssetHistoryDialogProps) {
  const { data: history, isLoading } = useAssetHistory(assetId);
  return (
    <HistoryDialog open={open} onOpenChange={onOpenChange} title={assetName}>
      <AssetHistoryTimeline history={history} isLoading={isLoading} />
    </HistoryDialog>
  );
}
