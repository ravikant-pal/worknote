import { getImageUrl } from '../services/imageStorage';

// Cache resolved blob URLs in memory so we don't recreate them on every render
const resolved = new Map();

/**
 * Called by BlockNote when it encounters an image src in the document.
 * If the src is a worknote:// URL, resolve it from Cache Storage.
 * Otherwise return the src as-is (handles http:// URLs in public notes).
 */
export async function resolveImage(src) {
  if (!src?.startsWith('worknote://image/')) return src;

  const uuid = src.replace('worknote://image/', '');

  if (resolved.has(uuid)) return resolved.get(uuid);

  const blobUrl = await getImageUrl(uuid);
  if (blobUrl) resolved.set(uuid, blobUrl);

  return blobUrl ?? src;
}

/**
 * Clear a specific UUID from the in-memory cache.
 * Call this after deleting an image from Cache Storage.
 */
export function clearResolvedImage(uuid) {
  resolved.delete(uuid);
}
