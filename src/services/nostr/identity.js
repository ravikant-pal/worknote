import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '../../utils/hex';
import db from '../db';

// ── Key Generation ────────────────────────────────────────────────────────────

/**
 * Generate a brand new keypair.
 * Returns { privkeyHex, pubkeyHex, nsec, npub }
 */
export function generateKeypair() {
  const privkeyBytes = generateSecretKey();
  const privkeyHex = bytesToHex(privkeyBytes);
  const pubkeyHex = getPublicKey(privkeyBytes);
  const nsec = nip19.nsecEncode(privkeyBytes);
  const npub = nip19.npubEncode(pubkeyHex);
  return { privkeyHex, pubkeyHex, nsec, npub };
}

// ── Encode / Decode ───────────────────────────────────────────────────────────

export function npubFromHex(pubkeyHex) {
  return nip19.npubEncode(pubkeyHex);
}

export function hexFromNpub(npub) {
  const { type, data } = nip19.decode(npub);
  if (type !== 'npub') throw new Error('Not a valid npub');
  return data;
}

export function nsecFromHex(privkeyHex) {
  return nip19.nsecEncode(hexToBytes(privkeyHex));
}

export function hexFromNsec(nsec) {
  const { type, data } = nip19.decode(nsec);
  if (type !== 'nsec') throw new Error('Not a valid nsec');
  return bytesToHex(data);
}

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Save identity to IndexedDB profile table.
 * Never store privkey in plaintext in production — acceptable for MVP.
 */
export async function saveIdentity({ privkeyHex, pubkeyHex, displayName }) {
  await db.profile.put({
    id: 'me',
    privkeyHex,
    pubkeyHex,
    displayName: displayName ?? 'Anonymous',
    relays: defaultRelays(),
    createdAt: Date.now(),
  });
}

/**
 * Load identity from IndexedDB.
 * Returns null if first run (onboarding not completed).
 */
export async function loadIdentity() {
  return db.profile.get('me');
}

/**
 * Update just the display name.
 */
export async function updateDisplayName(displayName) {
  await db.profile.update('me', { displayName });
}

/**
 * Update relay list.
 */
export async function updateRelays(relays) {
  await db.profile.update('me', { relays });
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export function defaultRelays() {
  return ['wss://relay.damus.io', 'wss://relay.primal.net'];
}
