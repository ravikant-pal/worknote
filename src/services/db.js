import Dexie from 'dexie';

const db = new Dexie('worknote');

db.version(1).stores({
  // &id = primary key, * = multi-entry index
  notes: '&id, folderId, updatedAt, isPublic, nostrEventId',
  folders: '&id, parentId, updatedAt',
  shares: '&id, resourceId, resourceType, permission',
  profile: '&id', // single row, id = "me"
  syncQueue: '++seq, type, resourceId, retries',
});

export default db;
