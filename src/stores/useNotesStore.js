import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import db from '../services/db';
import { encryptContent, generateShareKey } from '../services/nostr/events';
import { queueNoteSync } from '../services/nostr/sync';

const useNotesStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  notes: [], // all notes from IndexedDB
  folders: [], // all folders from IndexedDB
  activeNoteId: null, // currently open note id
  activeFolderId: null, // currently selected folder id

  // ── Init ───────────────────────────────────────────────────────────────────

  init: async () => {
    const [notes, folders] = await Promise.all([
      db.notes.orderBy('updatedAt').reverse().toArray(),
      db.folders.orderBy('updatedAt').reverse().toArray(),
    ]);
    set({ notes, folders });
  },

  // ── Folders ────────────────────────────────────────────────────────────────

  createFolder: async (name, parentId = null) => {
    const folder = {
      id: uuidv4(),
      name,
      parentId,
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.folders.add(folder);
    set((s) => ({ folders: [folder, ...s.folders] }));
    return folder;
  },

  renameFolder: async (folderId, name) => {
    await db.folders.update(folderId, { name, updatedAt: Date.now() });
    set((s) => ({
      folders: s.folders.map((f) => (f.id === folderId ? { ...f, name } : f)),
    }));
  },

  deleteFolder: async (folderId) => {
    // Move child notes to root
    await db.notes
      .where('folderId')
      .equals(folderId)
      .modify({ folderId: null });
    await db.folders.delete(folderId);
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== folderId),
      notes: s.notes.map((n) =>
        n.folderId === folderId ? { ...n, folderId: null } : n
      ),
      activeFolderId: s.activeFolderId === folderId ? null : s.activeFolderId,
    }));
  },

  setActiveFolder: (folderId) => set({ activeFolderId: folderId }),

  // ── Notes ──────────────────────────────────────────────────────────────────

  createNote: async (folderId = null) => {
    const note = {
      id: uuidv4(),
      folderId,
      title: 'Untitled',
      content: '', // BlockNote JSON string — empty on creation
      isPublic: false,
      shareKey: null, // generated on first share
      writerPubkeys: [],
      syncContent: '', // encrypted or raw — set before sync
      nostrEventId: null,
      authorPubkey: null, // set from identity on first save
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.notes.add(note);
    set((s) => ({ notes: [note, ...s.notes], activeNoteId: note.id }));
    return note;
  },

  updateNote: async (noteId, { title, content }) => {
    const updatedAt = Date.now();
    await db.notes.update(noteId, { title, content, updatedAt });
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, title, content, updatedAt } : n
      ),
    }));
  },

  deleteNote: async (noteId) => {
    await db.notes.delete(noteId);
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== noteId),
      activeNoteId: s.activeNoteId === noteId ? null : s.activeNoteId,
    }));
  },

  setActiveNote: (noteId) => set({ activeNoteId: noteId }),

  getActiveNote: () => {
    const { notes, activeNoteId } = get();
    return notes.find((n) => n.id === activeNoteId) ?? null;
  },

  // ── Sharing ────────────────────────────────────────────────────────────────

  /**
   * Toggle a note between public and private.
   * Generates a shareKey on first share if private.
   * Returns the share link fragment.
   */
  shareNote: async (noteId, isPublic) => {
    const note = await db.notes.get(noteId);
    let shareKey = note.shareKey;

    // Generate share key for private notes on first share
    if (!isPublic && !shareKey) {
      shareKey = generateShareKey();
    }

    // Pre-encrypt content for private notes
    let syncContent = note.content;
    if (!isPublic && shareKey) {
      syncContent = await encryptContent(note.content, shareKey);
    }

    await db.notes.update(noteId, { isPublic, shareKey, syncContent });
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, isPublic, shareKey, syncContent } : n
      ),
    }));

    await queueNoteSync(noteId);

    // Return the shareable URL fragment
    const baseUrl = `${window.location.origin}/note/${noteId}`;
    return isPublic ? baseUrl : `${baseUrl}#${shareKey}`;
  },

  /**
   * Grant write access to a collaborator by their pubkey.
   */
  addWriter: async (noteId, writerPubkey) => {
    const note = await db.notes.get(noteId);
    const writerPubkeys = [
      ...new Set([...(note.writerPubkeys ?? []), writerPubkey]),
    ];
    await db.notes.update(noteId, { writerPubkeys });
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, writerPubkeys } : n
      ),
    }));
    await queueNoteSync(noteId);
  },

  removeWriter: async (noteId, writerPubkey) => {
    const note = await db.notes.get(noteId);
    const writerPubkeys = (note.writerPubkeys ?? []).filter(
      (pk) => pk !== writerPubkey
    );
    await db.notes.update(noteId, { writerPubkeys });
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, writerPubkeys } : n
      ),
    }));
    await queueNoteSync(noteId);
  },

  // ── Incoming sync (from subscribeToNote) ───────────────────────────────────

  applyRemoteNote: (updatedNote) => {
    set((s) => {
      const exists = s.notes.find((n) => n.id === updatedNote.id);
      if (exists) {
        return {
          notes: s.notes.map((n) =>
            n.id === updatedNote.id ? { ...n, ...updatedNote } : n
          ),
        };
      }
      return { notes: [updatedNote, ...s.notes] };
    });
  },
}));

export default useNotesStore;
