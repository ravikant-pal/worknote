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
    if (!identity && !onboarding) {
      // Save the share URL so we can return to it after onboarding
      const fullHash = window.location.hash; // e.g. #/note/abc?key=xyz
      if (fullHash.includes('/note/')) {
        sessionStorage.setItem('worknote-pending-share', fullHash);
      }
      navigate('/onboarding', { replace: true });
    }
    if (identity && onboarding) navigate('/', { replace: true });
  }, [isLoaded, identity]);

  useEffect(() => {
    if (!isLoaded || !identity) return;
    const match = location.pathname.match(/^\/note\/([^/]+)$/);
    if (!match) return;
    const noteId = match[1];
    // With HashRouter, share key is a query param: ?key=...
    const params = new URLSearchParams(location.search);
    const shareKey = params.get('key');
    importSharedNote(noteId, shareKey);
  }, [isLoaded, identity, location.pathname, location.search]);

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
  const useNotes = (await import('./stores/useNotesStore')).default;
  const { getConnectedRelays } = await import('./services/nostr/client');

  // Already have it locally — just activate
  const existing = await db.notes.get(noteId);
  if (existing) {
    useNotes.getState().setActiveNote(noteId);
    return;
  }

  // Wait up to 5 seconds for at least one relay to connect
  let attempts = 0;
  while (getConnectedRelays().length === 0 && attempts < 10) {
    await new Promise((r) => setTimeout(r, 500));
    attempts++;
  }

  if (getConnectedRelays().length === 0) {
    console.warn(
      '[share] no relays connected after waiting, cannot fetch note'
    );
    return;
  }

  const note = await fetchNoteById(noteId, shareKey);
  if (!note) {
    console.warn('[share] note not found on relays:', noteId);
    return;
  }

  await db.notes.put({
    ...note,
    shareKey: shareKey ?? null,
    writerPubkeys: [],
    syncContent: '',
    createdAt: note.updatedAt,
  });
  useNotes.getState().init();
  useNotes.getState().setActiveNote(noteId);
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
