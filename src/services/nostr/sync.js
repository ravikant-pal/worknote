import { Relay } from 'nostr-tools';
import db from '../db';
import { fetchEvents, getConnectedRelays, publishEvent } from './client';
import {
  buildFolderEvent,
  buildNoteEvent,
  decryptContent,
  KIND_NOTE,
} from './events';

// ADD this helper at the top of sync.js:
function parseNoteFromEvent(event, content, existing) {
  const titleTag = event.tags.find((t) => t[0] === 'title');
  const folderTag = event.tags.find((t) => t[0] === 'folder');
  // Writers are tagged as: ['p', '<pubkey>', '', 'writer']
  const writerPubkeys = event.tags
    .filter((t) => t[0] === 'p' && t[3] === 'writer')
    .map((t) => t[1]);

  return {
    id: event.tags.find((t) => t[0] === 'd')?.[1],
    title: titleTag?.[1] ?? existing?.title ?? 'Untitled',
    content,
    folderId: folderTag?.[1] ?? existing?.folderId ?? null,
    isPublic: event.tags.some((t) => t[0] === 't' && t[1] === 'public'),
    authorPubkey: event.pubkey,
    nostrEventId: event.id,
    writerPubkeys, // ← parsed from event
    updatedAt: event.created_at * 1000,
    // Preserve local createdAt if exists, otherwise use event time
    createdAt: existing?.createdAt ?? event.created_at * 1000,
    // Preserve local shareKey — relay doesn't store it
    shareKey: existing?.shareKey ?? null,
    syncContent: existing?.syncContent ?? '',
  };
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * Publish a note to Nostr relays.
 * Queues in syncQueue first — flushQueue() sends it.
 */
export async function queueNoteSync(noteId) {
  await db.syncQueue.put({
    type: 'note',
    resourceId: noteId,
    retries: 0,
    queuedAt: Date.now(),
  });
}

export async function queueFolderSync(folderId) {
  await db.syncQueue.put({
    type: 'folder',
    resourceId: folderId,
    retries: 0,
    queuedAt: Date.now(),
  });
}

/**
 * Flush pending sync queue — call this when relay connection is confirmed.
 */
// REPLACE flushQueue entirely:
export async function flushQueue(identity) {
  const pending = await db.syncQueue.toArray();
  if (!pending.length) return;

  for (const item of pending) {
    try {
      let event;

      if (item.type === 'note') {
        const note = await db.notes.get(item.resourceId);
        if (!note) {
          await db.syncQueue.delete(item.seq);
          continue;
        }

        const contentToPublish = note.isPublic
          ? note.content
          : note.syncContent || note.content;

        if (!contentToPublish) {
          await db.syncQueue.delete(item.seq);
          continue;
        }

        // Always include the original author in writerPubkeys
        // so they never lose edit access when a collaborator publishes
        const writerPubkeys = [
          ...new Set(
            [
              ...(note.writerPubkeys ?? []),
              note.authorPubkey, // ← preserve original author
            ].filter(Boolean)
          ),
        ].filter((pk) => pk !== identity.pubkeyHex); // don't add self as writer

        event = buildNoteEvent({
          privkeyHex: identity.privkeyHex,
          noteId: note.id,
          title: note.title || 'Untitled',
          content: contentToPublish,
          folderId: note.folderId,
          isPublic: note.isPublic,
          writerPubkeys,
        });
      } else if (item.type === 'folder') {
        const folder = await db.folders.get(item.resourceId);
        if (!folder) {
          await db.syncQueue.delete(item.seq);
          continue;
        }

        event = buildFolderEvent({
          privkeyHex: identity.privkeyHex,
          folderId: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          isPublic: folder.isPublic ?? false,
        });
      }

      if (!event) continue;

      console.log('[sync] publishing event:', event.id, 'kind:', event.kind);
      const result = await publishEvent(event);

      if (result.ok) {
        console.log('[sync] ✅ published:', item.resourceId);
        await db.syncQueue.delete(item.seq);
        if (item.type === 'note') {
          await db.notes.update(item.resourceId, {
            nostrEventId: event.id,
            authorPubkey: identity.pubkeyHex,
          });
        }
      } else {
        console.warn(
          '[sync] ❌ publish failed for:',
          item.resourceId,
          result.err
        );
        await db.syncQueue.update(item.seq, {
          retries: (item.retries ?? 0) + 1,
        });
      }
    } catch (err) {
      console.error('[sync] flush error for', item.resourceId, err);
      await db.syncQueue.update(item.seq, { retries: (item.retries ?? 0) + 1 });
    }
  }
}

// ── Subscribe to a specific note (real-time collab) ───────────────────────────

/**
 * Subscribe to live updates for a note by its UUID.
 * onUpdate(updatedNote) is called whenever a newer version arrives.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToNote(noteId, shareKeyHex, onUpdate) {
  const relays = getConnectedRelays();
  const unsubs = [];

  relays.forEach(async (url) => {
    try {
      const relay = await Relay.connect(url);
      const sub = relay.subscribe([{ kinds: [KIND_NOTE], '#d': [noteId] }], {
        onevent: async (event) => {
          const existing = await db.notes.get(noteId);

          // Ignore if we already have this version or newer
          if (existing && existing.updatedAt >= event.created_at * 1000) return;

          let content = event.content;
          if (shareKeyHex) {
            try {
              content = await decryptContent(event.content, shareKeyHex);
            } catch {
              return;
            }
          }

          const updated = parseNoteFromEvent(event, content, existing);
          await db.notes.put(updated);
          onUpdate(updated);
          console.log('[sync] 🔄 remote update received for:', noteId);
        },
      });
      unsubs.push(() => sub.close());
    } catch (err) {
      console.warn('[sync] subscribeToNote failed for relay:', url, err);
    }
  });

  return () => unsubs.forEach((fn) => fn());
}

// ── Fetch a note by ID from relays (share link import) ────────────────────────

/**
 * Fetch a note from relays by its UUID.
 * Used when a user opens a share link for the first time.
 */
export async function fetchNoteById(
  noteId,
  shareKeyHex,
  { retries = 5, delayMs = 2000 } = {}
) {
  console.log(
    '[sync] fetching note:',
    noteId,
    'from relays:',
    getConnectedRelays()
  );

  // Load existing local record to preserve fields
  const existing = await db.notes.get(noteId).catch(() => null);

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[sync] fetch attempt ${attempt}/${retries}`);

    try {
      const events = await fetchEvents([
        {
          kinds: [KIND_NOTE],
          '#d': [noteId],
          limit: 10,
        },
      ]);

      console.log(`[sync] got ${events.length} events for note:`, noteId);

      if (events.length > 0) {
        const event = events.sort((a, b) => b.created_at - a.created_at)[0];

        let content = event.content;
        if (shareKeyHex) {
          try {
            content = await decryptContent(event.content, shareKeyHex);
          } catch (e) {
            console.warn('[sync] decryption failed:', e);
            return null;
          }
        }

        return parseNoteFromEvent(event, content, existing);
      }
    } catch (err) {
      console.warn(`[sync] fetch attempt ${attempt} error:`, err);
    }

    if (attempt < retries) {
      console.log(`[sync] retrying in ${delayMs}ms…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  console.warn('[sync] note not found after', retries, 'attempts:', noteId);
  return null;
}

// ── Search public notes by title ──────────────────────────────────────────────

/**
 * Search public notes on relays that support NIP-50 full-text search.
 * Falls back to fetching recent public notes if relay doesn't support search.
 */
export async function searchPublicNotes(query) {
  const events = await fetchEvents([
    {
      kinds: [KIND_NOTE],
      '#t': ['public'],
      search: query, // NIP-50 — ignored by relays that don't support it
      limit: 30,
    },
  ]);

  return events.map((event) => {
    const titleTag = event.tags.find((t) => t[0] === 'title');
    return {
      id: event.tags.find((t) => t[0] === 'd')?.[1],
      title: titleTag?.[1] ?? 'Untitled',
      authorPubkey: event.pubkey,
      nostrEventId: event.id,
      updatedAt: event.created_at * 1000,
    };
  });
}
