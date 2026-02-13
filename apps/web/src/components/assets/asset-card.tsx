import { Link } from "react-router-dom";
import { MapPin, Pencil, Trash2, User } from "lucide-react";
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
    <div className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40">
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/assets/${asset.id}`}
            className="text-sm font-medium hover:underline underline-offset-2 truncate block"
          >
            {asset.name}
          </Link>
          {asset.serialNumber && (
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
              {asset.serialNumber}
            </p>
          )}
        </div>
        <AssetStatusBadge status={asset.status} />
      </div>

      {/* Meta */}
      <div className="space-y-1.5">
        {asset.assetTypeName && (
          <p className="text-xs text-muted-foreground">{asset.assetTypeName}</p>
        )}
        {asset.locationName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{asset.locationName}</span>
          </div>
        )}
        {asset.assignedPersonName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{asset.assignedPersonName}</span>
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onEdit(asset)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={() => onArchive(asset)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
