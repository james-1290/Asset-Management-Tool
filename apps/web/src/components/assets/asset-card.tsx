import { MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { AssetStatusBadge } from "./asset-status-badge";
import type { Asset } from "../../types/asset";

interface AssetCardProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onArchive: (asset: Asset) => void;
}

export function AssetCard({ asset, onEdit, onArchive }: AssetCardProps) {
  return (
    <div className="group relative rounded-md border p-3 transition-colors hover:bg-muted/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          {asset.serialNumber && (
            <p className="text-xs text-muted-foreground truncate">
              S/N: {asset.serialNumber}
            </p>
          )}
        </div>
        <AssetStatusBadge status={asset.status} />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{asset.assetTypeName}</p>
        {asset.locationName && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{asset.locationName}</span>
          </div>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(asset)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => onArchive(asset)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
