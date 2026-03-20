import { create } from 'zustand';
import { connectRelays } from '../services/nostr/client';
import {
  generateKeypair,
  loadIdentity,
  saveIdentity,
  updateDisplayName,
  updateRelays,
} from '../services/nostr/identity';

const useIdentityStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  identity: null, // { id, privkeyHex, pubkeyHex, nsec, npub, displayName, relays }
  isLoaded: false, // true once loadIdentity() has resolved (even if null)

  // ── Init ───────────────────────────────────────────────────────────────────

  /**
   * Call once on app startup.
   * If identity exists → connect relays.
   * If not → onboarding flow handles createIdentity().
   */
  init: async () => {
    const identity = await loadIdentity();
    if (identity) {
      const relays = identity.relays?.length
        ? identity.relays
        : defaultRelays();
      connectRelays(relays);
      if (!identity.relays?.length) {
        await updateRelays(relays);
        identity.relays = relays;
      }
    }
    set({ identity, isLoaded: true });
  },

  // ── Create (onboarding) ────────────────────────────────────────────────────

  createIdentity: async (displayName) => {
    const kp = generateKeypair();
    await saveIdentity({
      privkeyHex: kp.privkeyHex,
      pubkeyHex: kp.pubkeyHex,
      displayName,
    });
    const identity = await loadIdentity();
    connectRelays(identity.relays);
    set({ identity });

    // Redirect to pending share link if one was saved
    const pending = sessionStorage.getItem('worknote-pending-share');
    if (pending) {
      sessionStorage.removeItem('worknote-pending-share');
      // Small delay to let relays connect first
      setTimeout(() => {
        window.location.hash = pending;
      }, 1500);
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────

  setDisplayName: async (displayName) => {
    await updateDisplayName(displayName);
    set((s) => ({ identity: { ...s.identity, displayName } }));
  },

  setRelays: async (relays) => {
    await updateRelays(relays);
    connectRelays(relays);
    set((s) => ({ identity: { ...s.identity, relays } }));
  },
}));

export default useIdentityStore;
