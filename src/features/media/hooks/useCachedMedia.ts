import { useEffect, useState } from 'react';

import type { MediaAsset } from '../../../shared/api/canplanTypes';
import { ensureCachedMediaUri, getCachedMediaUri } from '../cache/mediaFileCache';
import { useMediaDownloadUrl } from './useMedia';

/**
 * Resolves a usable URI for a step's media asset, with on-device caching:
 *
 * - VIDEO / AUDIO → cached to a local file keyed by `assetId`
 *   (see mediaFileCache), so it survives URL rotation + app reloads and plays
 *   offline once downloaded. Falls back to the remote URL until the file exists.
 * - IMAGE (and anything else) → returns the remote URL directly; image bytes are
 *   cached by expo-image through a stable `cacheKey` (see CachedImage), which is
 *   a better fit than a hand-rolled file cache.
 *
 * The only backend-specific piece is `useMediaDownloadUrl` (where the URL comes
 * from). If the backend later moves to Amplify, only that changes — the caching
 * behaviour here stays the same.
 */
export function useCachedMediaUri(taskId: string, asset?: MediaAsset): string | null {
  const query = useMediaDownloadUrl(taskId, asset?.assetId ?? '');
  const remoteUrl = query.data?.downloadUrl ?? null;
  const shouldCacheToFile = asset?.type === 'VIDEO' || asset?.type === 'AUDIO';

  const [localUri, setLocalUri] = useState<string | null>(null);

  // Forget the previous file when the asset changes.
  useEffect(() => {
    setLocalUri(null);
  }, [asset?.assetId]);

  useEffect(() => {
    if (!shouldCacheToFile || !asset) return;
    const { assetId, mimeType } = asset;
    let active = true;

    void (async () => {
      // 1) Already on disk → use it immediately, no network needed (offline-ok).
      const existing = await getCachedMediaUri(assetId, mimeType);
      if (!active) return;
      if (existing) {
        setLocalUri(existing);
        return;
      }
      // 2) Not cached yet → need the remote URL to download it.
      if (!remoteUrl) return;
      try {
        const cached = await ensureCachedMediaUri(assetId, mimeType, remoteUrl);
        if (active) setLocalUri(cached);
      } catch {
        // Download failed — leave localUri null so we fall back to the remote URL.
      }
    })();

    return () => {
      active = false;
    };
  }, [shouldCacheToFile, asset, remoteUrl]);

  if (!shouldCacheToFile) return remoteUrl;
  return localUri ?? remoteUrl;
}
