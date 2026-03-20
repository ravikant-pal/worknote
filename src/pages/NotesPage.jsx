import { MantineProvider } from '@mantine/core';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import PublicIcon from '@mui/icons-material/Public';
import ShareIcon from '@mui/icons-material/Share';
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import { useCallback, useEffect, useRef, useState } from 'react';
import { queueNoteSync } from '../services/nostr/sync';

import { useNavigate } from 'react-router-dom';
import ShareDialog from '../components/ShareDialog';
import Sidebar from '../components/Sidebar/Sidebar';
import WorkNoteEditor from '../editor/WorkNoteEditor';
import { subscribeToNote } from '../services/nostr/sync';
import useIdentityStore from '../stores/useIdentityStore';
import useNotesStore from '../stores/useNotesStore';
import useSyncStore from '../stores/useSyncStore';

export default function NotesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const {
    notes,
    activeNoteId,
    updateNote,
    getActiveNote,
    sharedNoteLoading,
    sharedNoteError,
    applyRemoteNote,
    canEditNote,
  } = useNotesStore();
  const { identity } = useIdentityStore();
  const { sync } = useSyncStore();

  const activeNote = getActiveNote();

  const [title, setTitle] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [syncToast, setSyncToast] = useState(false);
  const [remoteUpdateToast, setRemoteUpdateToast] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedOk, setPublishedOk] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState(0);

  // ── Refs to avoid stale closures in debounced callbacks ──────────────────
  const activeNoteIdRef = useRef(activeNoteId);
  const titleRef = useRef(title);
  const timerTitle = useRef(null);
  const timerContent = useRef(null);

  const editable = canEditNote(activeNoteId, identity?.pubkeyHex);

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

  useEffect(() => {
    if (!activeNoteId) return;

    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) return;

    // Only subscribe if note is shared (has been published)
    if (!note.nostrEventId) return;

    console.log('[collab] subscribing to note:', activeNoteId);

    const unsub = subscribeToNote(
      activeNoteId,
      note.shareKey ?? null,
      (updatedNote) => {
        applyRemoteNote(updatedNote);
        setRemoteUpdateToast(true);
        // If this note is currently open, bump version to force editor reload
        if (updatedNote.id === activeNoteIdRef.current) {
          setRemoteVersion((v) => v + 1);
        }
      }
    );

    return () => {
      console.log('[collab] unsubscribing from note:', activeNoteId);
      unsub();
    };
  }, [activeNoteId]);

  const handlePublish = async () => {
    if (!activeNoteId || !identity) return;
    setPublishing(true);
    try {
      await queueNoteSync(activeNoteId);
      await sync(identity);
      setPublishedOk(true);
      setTimeout(() => setPublishedOk(false), 3000);
    } catch (err) {
      console.error('[publish] failed:', err);
    } finally {
      setPublishing(false);
    }
  };

  // ── Debounced saves using refs so noteId is never stale ─────────────────

  const handleTitleChange = useCallback(
    (e) => {
      if (!canEditNote(activeNoteIdRef.current, identity?.pubkeyHex)) return;
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
      if (!canEditNote(activeNoteIdRef.current, identity?.pubkeyHex)) return; // ← add this
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

                {!editable && (
                  <Chip
                    label='Read only'
                    size='small'
                    sx={{
                      flexShrink: 0,
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: 'warning.main',
                      color: '#fff',
                      borderRadius: 1,
                    }}
                  />
                )}

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

                {editable &&
                  (isMobile ? (
                    <Tooltip
                      title={publishedOk ? 'Published!' : 'Publish to network'}
                    >
                      <IconButton
                        size='small'
                        onClick={handlePublish}
                        disabled={publishing}
                        sx={{
                          flexShrink: 0,
                          color: publishedOk
                            ? 'success.main'
                            : 'text.secondary',
                        }}
                      >
                        {publishing ? (
                          <CircularProgress size={16} />
                        ) : publishedOk ? (
                          <CloudDoneIcon fontSize='small' />
                        ) : (
                          <CloudUploadIcon fontSize='small' />
                        )}
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Button
                      size='small'
                      variant={publishedOk ? 'contained' : 'outlined'}
                      color={publishedOk ? 'success' : 'primary'}
                      onClick={handlePublish}
                      disabled={publishing}
                      startIcon={
                        publishing ? (
                          <CircularProgress size={14} />
                        ) : publishedOk ? (
                          <CloudDoneIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <CloudUploadIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      sx={{ flexShrink: 0, fontSize: '0.8rem', py: 0.5 }}
                    >
                      {publishing
                        ? 'Publishing…'
                        : publishedOk
                          ? 'Published!'
                          : 'Publish'}
                    </Button>
                  ))}

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
                  noteId={`${activeNoteId}-${remoteVersion}`}
                  content={activeNote.content}
                  onChange={handleContentChange}
                  readOnly={!editable}
                />
              </Box>
            </>
          ) : sharedNoteLoading ? (
            /* ── Shared note loading state ── */
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                px: 4,
              }}
            >
              <Box sx={{ fontSize: 48 }}>🔗</Box>
              <Typography variant='h3' color='text.primary'>
                Loading shared note…
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ textAlign: 'center' }}
              >
                Connecting to the network and fetching your note. This usually
                takes a few seconds.
              </Typography>
              <LinearProgress
                sx={{ width: '100%', maxWidth: 320, borderRadius: 4, mt: 1 }}
              />
            </Box>
          ) : sharedNoteError ? (
            /* ── Shared note error state ── */
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                px: 4,
              }}
            >
              <Box sx={{ fontSize: 48 }}>⚠️</Box>
              <Typography variant='h3' color='text.primary'>
                Could not load note
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ textAlign: 'center', maxWidth: 360 }}
              >
                {sharedNoteError}
              </Typography>
              <Button
                variant='outlined'
                onClick={() => {
                  useNotesStore.getState().setSharedNoteError(null);
                  navigate('/');
                }}
              >
                Go to my notes
              </Button>
            </Box>
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
                src={`${import.meta.env.BASE_URL}worknote-app-icon.svg`}
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
      <Snackbar
        open={remoteUpdateToast}
        autoHideDuration={3000}
        onClose={() => setRemoteUpdateToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity='info'
          icon='✏️'
          sx={{ borderRadius: 2 }}
          onClose={() => setRemoteUpdateToast(false)}
        >
          Note updated by a collaborator
        </Alert>
      </Snackbar>
    </MantineProvider>
  );
}
