import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '../../utils/hex';

// ── Event Kinds ───────────────────────────────────────────────────────────────

export const KIND_PROFILE = 0;
export const KIND_NOTE = 30001; // parameterized replaceable by d-tag (note UUID)
export const KIND_FOLDER = 30002; // parameterized replaceable by d-tag (folder UUID)

// ── Builders ──────────────────────────────────────────────────────────────────

/**
 * Build + sign a kind:0 profile event.
 */
export function buildProfileEvent({ privkeyHex, displayName }) {
  const content = JSON.stringify({ display_name: displayName });
  return sign(privkeyHex, {
    kind: KIND_PROFILE,
    content,
    tags: [],
    created_at: now(),
  });
}

/**
 * Build + sign a note event.
 *
 * content is a JSON string of the BlockNote document.
 * For private notes, pass already-encrypted content + isPublic: false.
 */
export function buildNoteEvent({
  privkeyHex,
  noteId,
  title,
  content,
  folderId,
  isPublic,
  writerPubkeys = [], // pubkeys granted write access
}) {
  const tags = [
    ['d', noteId],
    ['title', isPublic ? title : ''], // hide title for private notes
    ['client', 'worknote'],
  ];

  if (folderId) tags.push(['folder', folderId]);
  if (isPublic) tags.push(['t', 'public']);
  writerPubkeys.forEach((pk) => tags.push(['p', pk, '', 'writer']));

  return sign(privkeyHex, {
    kind: KIND_NOTE,
    content, // encrypted blob if private, raw JSON if public
    tags,
    created_at: now(),
  });
}

/**
 * Build + sign a folder event.
 */
export function buildFolderEvent({
  privkeyHex,
  folderId,
  name,
  parentId,
  isPublic,
}) {
  const tags = [
    ['d', folderId],
    ['name', isPublic ? name : ''],
    ['client', 'worknote'],
  ];
  if (parentId) tags.push(['parent', parentId]);
  if (isPublic) tags.push(['t', 'public']);

  return sign(privkeyHex, {
    kind: KIND_FOLDER,
    content: '',
    tags,
    created_at: now(),
  });
}

// ── Encryption (private notes) ────────────────────────────────────────────────

/**
 * Encrypt note content using the note's own share key.
 * shareKey is a 32-byte hex string generated when the note is first shared.
 *
 * Uses AES-GCM via WebCrypto — available in all modern browsers.
 */
export async function encryptContent(plaintext, shareKeyHex) {
  const keyBytes = hexToBytes(shareKeyHex);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );
  // Pack iv + ciphertext as base64
  const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt note content using the share key.
 */
export async function decryptContent(base64Ciphertext, shareKeyHex) {
  const keyBytes = hexToBytes(shareKeyHex);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const combined = Uint8Array.from(atob(base64Ciphertext), (c) =>
    c.charCodeAt(0)
  );
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );
  return new TextDecoder().decode(plainBuf);
}

/**
 * Generate a random 32-byte share key (hex).
 * Store this alongside the note in IndexedDB — it travels in the share link fragment.
 */
export function generateShareKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function now() {
  return Math.floor(Date.now() / 1000);
}

function sign(privkeyHex, eventTemplate) {
  return finalizeEvent(eventTemplate, hexToBytes(privkeyHex));
}
