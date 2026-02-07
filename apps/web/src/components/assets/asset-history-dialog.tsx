import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History &mdash; {assetName}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <AssetHistoryTimeline history={history} isLoading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
