import { MantineProvider } from '@mantine/core';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import PublicIcon from '@mui/icons-material/Public';
import ShareIcon from '@mui/icons-material/Share';
import {
  Alert,
  Box,
  Drawer,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import ShareDialog from '../components/ShareDialog';
import Sidebar from '../components/Sidebar/Sidebar';
import WorkNoteEditor from '../editor/WorkNoteEditor';
import useIdentityStore from '../stores/useIdentityStore';
import useNotesStore from '../stores/useNotesStore';
import useSyncStore from '../stores/useSyncStore';

export default function NotesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { activeNoteId, updateNote, getActiveNote } = useNotesStore();
  const { identity } = useIdentityStore();
  const { sync } = useSyncStore();

  const activeNote = getActiveNote();

  const [title, setTitle] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [syncToast, setSyncToast] = useState(false);

  // ── Refs to avoid stale closures in debounced callbacks ──────────────────
  const activeNoteIdRef = useRef(activeNoteId);
  const titleRef = useRef(title);
  const timerTitle = useRef(null);
  const timerContent = useRef(null);

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Reset title when switching notes — clear pending debounce timers too
  useEffect(() => {
    clearTimeout(timerTitle.current);
    clearTimeout(timerContent.current);
    setTitle(activeNote?.title ?? '');
  }, [activeNoteId]);

  // On mobile: close sidebar when a note is selected
  useEffect(() => {
    if (isMobile && activeNoteId) setSidebarOpen(false);
  }, [activeNoteId, isMobile]);

  // ── Debounced saves using refs so noteId is never stale ─────────────────

  const handleTitleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setTitle(val);
      clearTimeout(timerTitle.current);
      timerTitle.current = setTimeout(async () => {
        const id = activeNoteIdRef.current;
        if (!id) return;
        const note = useNotesStore.getState().notes.find((n) => n.id === id);
        if (!note) return;
        await updateNote(id, { title: val, content: note.content ?? '' });
        if (identity) sync(identity);
      }, 600);
    },
    [identity]
  );

  const handleContentChange = useCallback(
    (json) => {
      clearTimeout(timerContent.current);
      timerContent.current = setTimeout(async () => {
        const id = activeNoteIdRef.current;
        if (!id) return;
        await updateNote(id, { title: titleRef.current, content: json });
        if (identity) sync(identity);
      }, 800);
    },
    [identity]
  );

  // ── Sidebar (shared between desktop and mobile drawer) ───────────────────

  const sidebarContent = (
    <Sidebar onNoteSelect={() => isMobile && setSidebarOpen(false)} />
  );

  return (
    <MantineProvider>
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        {/* Desktop sidebar — permanent */}
        {!isMobile && <Box sx={{ flexShrink: 0 }}>{sidebarContent}</Box>}

        {/* Mobile sidebar — drawer */}
        {isMobile && (
          <Drawer
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            slotProps={{
              sx: {
                width: 280,
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {activeNote ? (
            <>
              {/* Toolbar */}
              <Box
                sx={{
                  px: { xs: 1.5, md: 3 },
                  py: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'background.paper',
                }}
              >
                {/* Hamburger — mobile only */}
                {isMobile && (
                  <IconButton
                    size='small'
                    onClick={() => setSidebarOpen(true)}
                    sx={{ flexShrink: 0 }}
                  >
                    <MenuIcon fontSize='small' />
                  </IconButton>
                )}

                {/* Visibility badge */}
                <Tooltip
                  title={activeNote.isPublic ? 'Public note' : 'Private note'}
                >
                  {activeNote.isPublic ? (
                    <PublicIcon
                      sx={{
                        fontSize: 16,
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <LockIcon
                      sx={{
                        fontSize: 16,
                        color: 'text.disabled',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Tooltip>

                {/* Editable title */}
                <TextField
                  variant='standard'
                  fullWidth
                  value={title}
                  onChange={handleTitleChange}
                  placeholder='Untitled'
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      fontSize: { xs: '1rem', md: '1.125rem' },
                      fontWeight: 600,
                      color: 'text.primary',
                    },
                  }}
                />

                {/* Share */}
                <Tooltip title='Share'>
                  <IconButton
                    onClick={() => setShareOpen(true)}
                    size='small'
                    sx={{ flexShrink: 0 }}
                  >
                    <ShareIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Editor */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  px: { xs: 1, md: 4 },
                  py: 2,
                  bgcolor: 'background.default',
                }}
              >
                <WorkNoteEditor
                  noteId={activeNoteId}
                  content={activeNote.content}
                  onChange={handleContentChange}
                  readOnly={false}
                />
              </Box>
            </>
          ) : (
            /* Empty state */
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                gap: 1,
              }}
            >
              {/* Hamburger for mobile empty state */}
              {isMobile && (
                <IconButton
                  onClick={() => setSidebarOpen(true)}
                  sx={{ position: 'absolute', top: 12, left: 12 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box
                component='img'
                src='/worknote-app-icon.svg'
                alt='WorkNote'
                sx={{ width: 50, height: 50 }}
              />
              <Typography variant='h3' color='text.secondary'>
                No note selected
              </Typography>
              <Typography variant='body2' color='text.disabled'>
                {isMobile
                  ? 'Tap ☰ to open your notes'
                  : 'Pick a note from the sidebar or create a new one'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Share dialog */}
      {activeNoteId && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          noteId={activeNoteId}
        />
      )}

      <Snackbar
        open={syncToast}
        autoHideDuration={2000}
        onClose={() => setSyncToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' sx={{ borderRadius: 2 }}>
          Note synced
        </Alert>
      </Snackbar>
    </MantineProvider>
  );
}
