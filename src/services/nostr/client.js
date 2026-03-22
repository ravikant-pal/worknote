import { Relay, SimplePool } from 'nostr-tools';

// ── Relay Pool ────────────────────────────────────────────────────────────────
// Single shared pool across the entire app lifetime

let pool = null;
let connectedRelays = [];
const listeners = new Set(); // (relayUrls: string[]) => void
const relayStatus = new Map(); // url → 'connecting' | 'connected' | 'error'

export function getPool() {
  if (!pool) pool = new SimplePool();
  return pool;
}

export function getRelayStatuses() {
  return Object.fromEntries(relayStatus);
}

export function getLiveRelayCount() {
  return [...relayStatus.values()].filter((s) => s === 'connected').length;
}

// ── Connection ────────────────────────────────────────────────────────────────

/**
 * Connect to a list of relay URLs.
 * SimplePool connects lazily on first use — this just stores the list.
 */
export async function connectRelays(relayUrls) {
  if (!relayUrls?.length) return;
  connectedRelays = [...relayUrls];
  notifyListeners();

  // Probe each relay with a real connection
  for (const url of relayUrls) {
    relayStatus.set(url, 'connecting');
    notifyListeners();
    Relay.connect(url)
      .then(() => {
        relayStatus.set(url, 'connected');
        console.log('[relay] ✅ connected:', url);
        notifyListeners();
      })
      .catch(() => {
        relayStatus.set(url, 'error');
        console.warn('[relay] ❌ failed:', url);
        notifyListeners();
      });
  }
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
  const errors = [];

  // Try each relay individually with proper await for confirmation
  const results = await Promise.allSettled(
    connectedRelays.map(async (url) => {
      const relay = await Relay.connect(url);
      await relay.publish(signedEvent);
      console.log('[nostr] ✅ confirmed by:', url);
      return url;
    })
  );

  const successful = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failed = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason);

  if (failed.length) console.warn('[nostr] ❌ failed relays:', failed);

  return {
    ok: successful.length > 0,
    successful,
    failed,
  };
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
 * Fetch events using subscribeMany with explicit EOSE + timeout.
 * More reliable than querySync which can silently timeout on lazy connections.
 */
export async function fetchEvents(filters, timeoutMs = 8000) {
  const events = new Map();

  await Promise.allSettled(
    connectedRelays.map(async (url) => {
      try {
        const relay = await Relay.connect(url);

        await new Promise((resolve) => {
          const timer = setTimeout(resolve, timeoutMs);

          const sub = relay.subscribe(filters, {
            onevent: (event) => {
              events.set(event.id, event);
            },
            oneose: () => {
              clearTimeout(timer);
              sub.close();
              resolve();
            },
          });
        });
      } catch (err) {
        console.warn('[nostr] fetchEvents failed for relay:', url, err);
      }
    })
  );

  console.log('[sync] total events fetched:', events.size);
  return Array.from(events.values());
}

// ── Relay Status Listeners ────────────────────────────────────────────────────

export function onRelaysChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(connectedRelays));
}
