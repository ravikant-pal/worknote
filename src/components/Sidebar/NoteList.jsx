import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import useNotesStore from '../../stores/useNotesStore';
import NoteCard from '../NoteCard';

export default function NoteList({ folderId, onNoteSelect }) {
  const { notes, activeNoteId, createNote, deleteNote, setActiveNote } =
    useNotesStore();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuNote, setMenuNote] = useState(null);

  const filtered = notes.filter((n) =>
    folderId === null ? true : n.folderId === folderId
  );

  const handleMenuClick = (e, note) => {
    setMenuAnchor(e.currentTarget);
    setMenuNote(note);
  };

  const handleDelete = async () => {
    if (menuNote) await deleteNote(menuNote.id);
    setMenuAnchor(null);
    setMenuNote(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Notes
        </Typography>
        <Button
          size='small'
          startIcon={<AddIcon />}
          onClick={() => createNote(folderId)}
          sx={{ fontSize: '0.75rem', py: 0.25 }}
        >
          New
        </Button>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {filtered.length === 0 ? (
          <Box sx={{ px: 1, py: 3, textAlign: 'center' }}>
            <Typography variant='caption' color='text.disabled'>
              No notes yet
            </Typography>
          </Box>
        ) : (
          filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onClick={() => {
                setActiveNote(note.id);
                onNoteSelect?.();
              }}
              onMenuClick={handleMenuClick}
            />
          ))
        )}
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 160 } }}
      >
        <MenuItem dense onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete note
        </MenuItem>
      </Menu>
    </Box>
  );
}
