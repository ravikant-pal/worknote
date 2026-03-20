import db from '../db';
import { fetchEvents, publishEvent, subscribe } from './client';
import {
  buildFolderEvent,
  buildNoteEvent,
  decryptContent,
  KIND_NOTE,
} from './events';

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
export async function flushQueue(identity) {
  const pending = await db.syncQueue.toArray();
  for (const item of pending) {
    try {
      let event;
      if (item.type === 'note') {
        const note = await db.notes.get(item.resourceId);
        if (!note) {
          await db.syncQueue.delete(item.seq);
          continue;
        }
        event = buildNoteEvent({
          privkeyHex: identity.privkeyHex,
          noteId: note.id,
          title: note.title,
          content: note.syncContent, // pre-encrypted or raw JSON
          folderId: note.folderId,
          isPublic: note.isPublic,
          writerPubkeys: note.writerPubkeys ?? [],
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

      const result = await publishEvent(event);
      if (result.ok) {
        await db.syncQueue.delete(item.seq);
        if (item.type === 'note') {
          await db.notes.update(item.resourceId, { nostrEventId: event.id });
        }
      } else {
        await db.syncQueue.update(item.seq, { retries: item.retries + 1 });
      }
    } catch (err) {
      console.warn('[sync] flush error for', item.resourceId, err);
      await db.syncQueue.update(item.seq, { retries: item.retries + 1 });
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
  return subscribe({
    filters: [{ kinds: [KIND_NOTE], '#d': [noteId] }],
    onEvent: async (event) => {
      const existing = await db.notes.get(noteId);

      // Ignore if we already have a newer version
      if (existing && existing.updatedAt >= event.created_at * 1000) return;

      let content = event.content;
      if (shareKeyHex) {
        try {
          content = await decryptContent(event.content, shareKeyHex);
        } catch {
          return;
        } // wrong key — ignore
      }

      const titleTag = event.tags.find((t) => t[0] === 'title');
      const folderTag = event.tags.find((t) => t[0] === 'folder');

      const updated = {
        id: noteId,
        title: titleTag?.[1] ?? existing?.title ?? 'Untitled',
        content: content,
        folderId: folderTag?.[1] ?? existing?.folderId ?? null,
        isPublic: event.tags.some((t) => t[0] === 't' && t[1] === 'public'),
        authorPubkey: event.pubkey,
        nostrEventId: event.id,
        updatedAt: event.created_at * 1000,
      };

      await db.notes.put(updated);
      onUpdate(updated);
    },
  });
}

// ── Fetch a note by ID from relays (share link import) ────────────────────────

/**
 * Fetch a note from relays by its UUID.
 * Used when a user opens a share link for the first time.
 */
export async function fetchNoteById(noteId, shareKeyHex) {
  const events = await fetchEvents([{ kinds: [KIND_NOTE], '#d': [noteId] }]);
  if (!events.length) return null;

  // Pick the most recent event
  const event = events.sort((a, b) => b.created_at - a.created_at)[0];

  let content = event.content;
  if (shareKeyHex) {
    try {
      content = await decryptContent(event.content, shareKeyHex);
    } catch {
      return null;
    } // bad key
  }

  const titleTag = event.tags.find((t) => t[0] === 'title');
  const folderTag = event.tags.find((t) => t[0] === 'folder');

  return {
    id: noteId,
    title: titleTag?.[1] ?? 'Shared Note',
    content,
    folderId: folderTag?.[1] ?? null,
    isPublic: event.tags.some((t) => t[0] === 't' && t[1] === 'public'),
    authorPubkey: event.pubkey,
    nostrEventId: event.id,
    updatedAt: event.created_at * 1000,
  };
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
