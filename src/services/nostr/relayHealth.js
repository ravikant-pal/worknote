const HEALTH_CACHE_KEY = 'worknote-relay-health';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// Curated list of browser-friendly Nostr relays
// These are known to support WebSocket connections from browsers
const KNOWN_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nostril.cam',
  'wss://topic.relays.land/praise',
  'wss://sendit.nosflare.com/',
];

/**
 * Probe a relay for latency by opening a WebSocket and timing it.
 * Returns { url, latencyMs, ok }
 */
async function probeRelay(url, timeoutMs = 4000) {
  const start = Date.now();
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.onopen = () => {
          ws.close();
          resolve();
        };
        ws.onerror = () => reject(new Error('failed'));
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ]);
    return { url, latencyMs: Date.now() - start, ok: true };
  } catch {
    return { url, latencyMs: Infinity, ok: false };
  }
}

/**
 * Probe all known relays in parallel and return the best N by latency.
 * Results are cached for 30 minutes.
 */
export async function getBestRelays(count = 3) {
  // Return cache if still fresh
  try {
    const cached = localStorage.getItem(HEALTH_CACHE_KEY);
    if (cached) {
      const { relays, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL && relays.length >= count) {
        console.log('[relay-health] using cached relays:', relays);
        return relays;
      }
    }
  } catch {}

  console.log('[relay-health] probing', KNOWN_RELAYS.length, 'relays…');

  try {
    const results = await Promise.all(
      KNOWN_RELAYS.map((url) => probeRelay(url))
    );

    const best = results
      .filter((r) => r.ok)
      .sort((a, b) => a.latencyMs - b.latencyMs)
      .slice(0, count);

    console.log(
      '[relay-health] results:',
      results
        .filter((r) => r.ok)
        .sort((a, b) => a.latencyMs - b.latencyMs)
        .map((r) => `${r.latencyMs}ms ${r.url}`)
    );

    if (best.length > 0) {
      const bestUrls = best.map((r) => r.url);
      localStorage.setItem(
        HEALTH_CACHE_KEY,
        JSON.stringify({
          relays: bestUrls,
          timestamp: Date.now(),
          latencies: best.map((r) => ({ url: r.url, ms: r.latencyMs })),
        })
      );
      console.log(
        '[relay-health] selected:',
        best.map((r) => `${r.latencyMs}ms ${r.url}`)
      );
      return bestUrls;
    }
  } catch (err) {
    console.warn('[relay-health] probe failed:', err);
  }

  console.warn('[relay-health] all probes failed, using fallback');
  return fallbackRelays();
}

/**
 * Get probe results with latencies for UI display.
 */
export function getCachedRelayHealth() {
  try {
    const cached = localStorage.getItem(HEALTH_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

/**
 * Force a fresh probe next time getBestRelays() is called.
 */
export function clearRelayCache() {
  localStorage.removeItem(HEALTH_CACHE_KEY);
}

function fallbackRelays() {
  return ['wss://relay.primal.net', 'wss://relay.damus.io'];
}
