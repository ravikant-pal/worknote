import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import useSyncStore from '../stores/useSyncStore';

export default function SyncStatusBar() {
  const { connectedRelays, isSyncing, lastSyncAt, error } = useSyncStore();
  const isOnline = connectedRelays.length > 0;

  const label = isSyncing
    ? 'Syncing...'
    : error
      ? 'Sync error'
      : isOnline
        ? `${connectedRelays.length} relay${connectedRelays.length > 1 ? 's' : ''} connected`
        : 'Offline';

  const color = error
    ? 'error.main'
    : isOnline
      ? 'success.main'
      : 'text.disabled';

  return (
    <Tooltip
      title={
        error
          ? error
          : isOnline
            ? connectedRelays.join('\n')
            : 'No relay connection'
      }
      placement='top'
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          cursor: 'default',
        }}
      >
        {isSyncing ? (
          <CircularProgress size={12} thickness={5} />
        ) : isOnline ? (
          <CloudDoneIcon sx={{ fontSize: 14, color }} />
        ) : (
          <CloudOffIcon sx={{ fontSize: 14, color }} />
        )}
        <Typography variant='caption' sx={{ color, fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}
