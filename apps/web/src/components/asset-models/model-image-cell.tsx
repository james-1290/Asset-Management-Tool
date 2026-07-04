import { useAssetModelImage } from "../../hooks/use-asset-model-image";
import type { AssetModel } from "../../types/asset-model";

export function ModelImageCell({ model }: { model: AssetModel }) {
  const { src } = useAssetModelImage(model.id, model.imageUrl);

  if (src) {
    return (
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
        <img src={src} alt={model.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
      {model.name.charAt(0).toUpperCase()}
    </div>
  );
}
