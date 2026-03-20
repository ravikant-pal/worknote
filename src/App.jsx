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

  const { setSharedNoteLoading, setSharedNoteError } = useNotes.getState();

  // Already have it locally — just activate, no loading needed
  const existing = await db.notes.get(noteId);
  if (existing) {
    useNotes.getState().setActiveNote(noteId);
    return;
  }

  setSharedNoteLoading(true);
  setSharedNoteError(null);

  try {
    // Wait up to 8 seconds for relay connection
    let attempts = 0;
    while (getConnectedRelays().length === 0 && attempts < 16) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    if (getConnectedRelays().length === 0) {
      setSharedNoteError(
        'Could not connect to any relay. Check your internet connection and try again.'
      );
      return;
    }

    console.log('[share] connected relays:', getConnectedRelays());

    // Retry up to 5 times with 2s delay — relay may need a moment to index
    const note = await fetchNoteById(noteId, shareKey, {
      retries: 5,
      delayMs: 2000,
    });

    if (!note) {
      setSharedNoteError(
        'Note not found on the network. The publisher may be on different relays — ask them to reshare the link.'
      );
      return;
    }

    // Only write if remote is newer or we don't have it locally
    const localRecord = await db.notes.get(noteId);
    if (!localRecord || localRecord.updatedAt < note.updatedAt) {
      await db.notes.put({
        ...note,
        // Never overwrite these from remote
        shareKey: localRecord?.shareKey ?? note.shareKey ?? shareKey ?? null,
        writerPubkeys: note.writerPubkeys?.length
          ? note.writerPubkeys
          : (localRecord?.writerPubkeys ?? []),
        syncContent: localRecord?.syncContent ?? '',
        createdAt: localRecord?.createdAt ?? note.createdAt,
      });
    } else {
      console.log('[share] local version is newer, skipping overwrite');
    }

    await useNotes.getState().init();
    useNotes.getState().setActiveNote(noteId);
  } catch (err) {
    setSharedNoteError('Something went wrong loading the shared note.');
    console.error('[share] import error:', err);
  } finally {
    setSharedNoteLoading(false);
  }
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
