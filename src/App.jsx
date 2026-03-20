import { Box, Button, CircularProgress, Snackbar } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import AppRouter from './router';
import useIdentityStore from './stores/useIdentityStore';
import useNotesStore from './stores/useNotesStore';
import useSyncStore from './stores/useSyncStore';
import useThemeStore from './stores/useThemeStore';
import buildTheme from './theme';

function AppInit() {
  const { init: initIdentity, isLoaded, identity } = useIdentityStore();
  const { init: initNotes } = useNotesStore();
  const { init: initSync } = useSyncStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const cleanup = initSync();
    initIdentity();
    initNotes();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const onboarding = location.pathname === '/onboarding';
    if (!identity && !onboarding) navigate('/onboarding', { replace: true });
    if (identity && onboarding) navigate('/', { replace: true });
  }, [isLoaded, identity]);

  useEffect(() => {
    if (!isLoaded || !identity) return;
    const match = location.pathname.match(/^\/note\/([^/]+)$/);
    if (!match) return;
    const noteId = match[1];
    const shareKey = location.hash.startsWith('#')
      ? location.hash.slice(1)
      : null;
    importSharedNote(noteId, shareKey);
  }, [isLoaded, identity, location.pathname]);

  if (!isLoaded) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={32} thickness={4} />
      </Box>
    );
  }

  return <AppRouter />;
}

async function importSharedNote(noteId, shareKey) {
  const { fetchNoteById } = await import('./services/nostr/sync');
  const { default: db } = await import('./services/db');
  const useNotesStore = (await import('./stores/useNotesStore')).default;
  const existing = await db.notes.get(noteId);
  if (existing) {
    useNotesStore.getState().setActiveNote(noteId);
    return;
  }
  const note = await fetchNoteById(noteId, shareKey);
  if (!note) return;
  await db.notes.put({
    ...note,
    shareKey: shareKey ?? null,
    writerPubkeys: [],
    syncContent: '',
    createdAt: note.updatedAt,
  });
  useNotesStore.getState().init();
  useNotesStore.getState().setActiveNote(noteId);
}

// ── Root: owns theme state ─────────────────────────────────────────────────────

export default function App() {
  const { mode } = useThemeStore();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppInit />
      <Snackbar
        open={needRefresh}
        message='A new version of WorkNote is available'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <Button
            size='small'
            color='primary'
            variant='contained'
            onClick={() => updateServiceWorker(true)}
            sx={{ ml: 1 }}
          >
            Update now
          </Button>
        }
      />
    </ThemeProvider>
  );
}
