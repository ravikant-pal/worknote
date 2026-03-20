import { create } from 'zustand';
import { onRelaysChange } from '../services/nostr/client';
import { flushQueue } from '../services/nostr/sync';

const useSyncStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  connectedRelays: [],
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0, // items in syncQueue
  error: null,

  // ── Init ───────────────────────────────────────────────────────────────────

  /**
   * Start listening to relay connection changes.
   * Call once on app startup after identity.init().
   */
  init: () => {
    const unsub = onRelaysChange((relays) => {
      set({ connectedRelays: relays });
    });
    return unsub; // call returned fn to stop listening (cleanup)
  },

  // ── Manual sync trigger ────────────────────────────────────────────────────

  /**
   * Flush the sync queue — call after every note save when online.
   */
  sync: async (identity) => {
    if (get().isSyncing) return;
    set({ isSyncing: true, error: null });
    try {
      await flushQueue(identity);
      set({ isSyncing: false, lastSyncAt: Date.now(), pendingCount: 0 });
    } catch (err) {
      set({ isSyncing: false, error: err.message });
    }
  },

  setPendingCount: (pendingCount) => set({ pendingCount }),
  clearError: () => set({ error: null }),
}));

export default useSyncStore;
