import { SimplePool } from 'nostr-tools';

// ── Relay Pool ────────────────────────────────────────────────────────────────
// Single shared pool across the entire app lifetime

let pool = null;
let connectedRelays = [];
const listeners = new Set(); // (relayUrls: string[]) => void

export function getPool() {
  if (!pool) pool = new SimplePool();
  return pool;
}

// ── Connection ────────────────────────────────────────────────────────────────

/**
 * Connect to a list of relay URLs.
 * SimplePool connects lazily on first use — this just stores the list.
 */
export function connectRelays(relayUrls) {
  if (!relayUrls?.length) return;
  connectedRelays = [...relayUrls];
  notifyListeners();
}

export function getConnectedRelays() {
  return connectedRelays;
}

/**
 * Cleanly close all relay connections.
 */
export async function disconnectAll() {
  if (pool) {
    await pool.close(connectedRelays);
    pool = null;
    connectedRelays = [];
    notifyListeners();
  }
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * Publish a signed Nostr event to all connected relays.
 * Returns a promise that resolves when at least one relay confirms.
 */
export async function publishEvent(signedEvent) {
  const p = getPool();
  try {
    await Promise.any(p.publish(connectedRelays, signedEvent));
    return { ok: true };
  } catch (err) {
    console.warn('[nostr] publish failed:', err);
    return { ok: false, err };
  }
}

// ── Subscribe ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to events matching filters.
 * Returns an unsubscribe function.
 *
 * onEvent(event) — called for each matching event
 * onEose()       — called when relay signals end-of-stored-events
 */
export function subscribe({ filters, onEvent, onEose }) {
  const p = getPool();
  const sub = p.subscribeMany(connectedRelays, filters, {
    onevent: onEvent,
    oneose: onEose ?? (() => {}),
  });
  return () => sub.close();
}

/**
 * One-shot fetch — returns array of events, closes subscription after EOSE.
 */
export async function fetchEvents(filters) {
  const p = getPool();
  return p.querySync(connectedRelays, filters);
}

// ── Relay Status Listeners ────────────────────────────────────────────────────

export function onRelaysChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(connectedRelays));
}
