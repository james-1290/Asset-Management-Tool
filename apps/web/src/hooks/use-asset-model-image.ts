import { useState, useEffect } from "react";

const blobCache = new Map<string, string>();

export function useAssetModelImage(assetModelId: string | null | undefined, imageUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Async image fetch: the effect synchronises component state with the network
  // request + the module-level blob cache, so setState inside it is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
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
    let cancelled = false;
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
        // A newer effect (or unmount) superseded this fetch — discard.
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        // A concurrent fetch for the same key already cached one — don't leak ours.
        const existing = blobCache.get(cacheKey);
        if (existing) {
          URL.revokeObjectURL(objectUrl);
          setSrc(existing);
          return;
        }
        blobCache.set(cacheKey, objectUrl);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetModelId, imageUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
