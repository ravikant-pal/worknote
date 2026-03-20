const CACHE_NAME = 'worknote-images';

// ── helpers ──────────────────────────────────────────────────────────────────

async function openCache() {
  return caches.open(CACHE_NAME);
}

function imageKey(uuid) {
  // Use a fake URL as the cache key — Cache Storage requires URL-like keys
  return `https://worknote.app/images/${uuid}`;
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Save a File or Blob under a UUID.
 * Returns the UUID so the editor can store it in the note JSON.
 */
export async function putImage(uuid, blob) {
  const cache = await openCache();
  const response = new Response(blob, {
    headers: { 'Content-Type': blob.type || 'image/png' },
  });
  await cache.put(imageKey(uuid), response);
  return uuid;
}

/**
 * Retrieve an image as a blob URL for rendering.
 * Returns null if not found (e.g. image deleted or not yet synced).
 */
export async function getImageUrl(uuid) {
  const cache = await openCache();
  const response = await cache.match(imageKey(uuid));
  if (!response) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Retrieve raw blob — used when encrypting/publishing to Nostr.
 */
export async function getImageBlob(uuid) {
  const cache = await openCache();
  const response = await cache.match(imageKey(uuid));
  if (!response) return null;
  return response.blob();
}

/**
 * Delete an image by UUID — call when a note embedding it is deleted.
 */
export async function deleteImage(uuid) {
  const cache = await openCache();
  return cache.delete(imageKey(uuid));
}

/**
 * List all stored image UUIDs.
 * Useful for garbage-collecting orphaned images.
 */
export async function listImageUuids() {
  const cache = await openCache();
  const keys = await cache.keys();
  return keys.map((req) => req.url.split('/images/')[1]);
}
