import { useState, useEffect } from "react";

const blobCache = new Map<string, string>();

export function useAssetModelImage(assetModelId: string | null | undefined, imageUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!assetModelId || !imageUrl) {
      setSrc(null);
      return;
    }

    const cacheKey = `${assetModelId}:${imageUrl}`;
    const cached = blobCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem("token");
    fetch(`/api/v1/asset-models/${assetModelId}/image`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load image");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        blobCache.set(cacheKey, objectUrl);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null))
      .finally(() => setIsLoading(false));
  }, [assetModelId, imageUrl]);

  return { src, isLoading };
}

export function clearAssetModelImageCache(assetModelId: string) {
  for (const [key, url] of blobCache.entries()) {
    if (key.startsWith(`${assetModelId}:`)) {
      URL.revokeObjectURL(url);
      blobCache.delete(key);
    }
  }
}
