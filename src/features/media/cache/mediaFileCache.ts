/**
 * On-device cache for step media (video/audio), keyed by the STABLE assetId.
 *
 * Why: S3 presigned download URLs rotate on every fetch, so any cache keyed by
 * URL misses on every screen change / app reload and re-downloads (the "flash").
 * Keying by assetId instead makes the bytes survive URL rotation and reloads,
 * and lets them play offline once downloaded.
 *
 * Images are NOT handled here — they go through expo-image's own disk cache via
 * a stable cacheKey (see shared/components/CachedImage). "Where the URL comes
 * from" lives one layer up (useCachedMedia → useMediaDownloadUrl), so swapping
 * the backend later (e.g. Amplify) only touches that, not this file.
 */
import {
  cacheDirectory,
  deleteAsync,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

// documentDirectory persists across reloads (cacheDirectory can be evicted by
// the OS). Falls back to cacheDirectory, then to '' (e.g. web) → caching is
// skipped and callers fall back to the remote URL.
const MEDIA_DIR = `${documentDirectory ?? cacheDirectory ?? ''}media-cache/`;

function extensionFor(mimeType: string): string {
  const subtype = mimeType.split('/')[1]?.toLowerCase() ?? '';
  if (subtype.includes('mp4')) return 'mp4';
  if (subtype.includes('quicktime') || subtype.includes('mov')) return 'mov';
  if (subtype.includes('m4a') || subtype.includes('mp4a') || subtype.includes('aac')) return 'm4a';
  if (subtype.includes('mpeg') || subtype.includes('mp3')) return 'mp3';
  if (subtype.includes('wav')) return 'wav';
  if (subtype.includes('png')) return 'png';
  if (subtype.includes('webp')) return 'webp';
  if (subtype.includes('jpeg') || subtype.includes('jpg')) return 'jpg';
  return subtype || 'bin';
}

/** Stable local path for an asset (pure, no I/O). */
function localPathFor(assetId: string, mimeType: string): string {
  const safeId = assetId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${MEDIA_DIR}${safeId}.${extensionFor(mimeType)}`;
}

let dirReady: Promise<void> | null = null;
function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = (async () => {
      const info = await getInfoAsync(MEDIA_DIR);
      if (!info.exists) {
        await makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
      }
    })().catch((error) => {
      dirReady = null; // allow a retry on the next call
      throw error;
    });
  }
  return dirReady;
}

/** Returns the local `file://` uri if already cached, else null (no download). */
export async function getCachedMediaUri(
  assetId: string,
  mimeType: string,
): Promise<string | null> {
  if (!MEDIA_DIR) return null;
  const info = await getInfoAsync(localPathFor(assetId, mimeType));
  return info.exists ? info.uri : null;
}

/**
 * Returns the local `file://` uri, downloading from `remoteUrl` first if not yet
 * cached. Throws on download failure so the caller can fall back to `remoteUrl`.
 */
export async function ensureCachedMediaUri(
  assetId: string,
  mimeType: string,
  remoteUrl: string,
): Promise<string> {
  if (!MEDIA_DIR) return remoteUrl;
  const path = localPathFor(assetId, mimeType);
  const info = await getInfoAsync(path);
  if (info.exists) return info.uri;
  await ensureDir();
  const result = await downloadAsync(remoteUrl, path);
  return result.uri;
}

/** Wipes the whole media cache (e.g. on sign-out). */
export async function clearMediaCache(): Promise<void> {
  if (!MEDIA_DIR) return;
  try {
    await deleteAsync(MEDIA_DIR, { idempotent: true });
  } finally {
    dirReady = null;
  }
}
