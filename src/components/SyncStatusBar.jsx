import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import useSyncStore from '../stores/useSyncStore';

export default function SyncStatusBar() {
  const { relayStatuses, liveRelayCount, isSyncing, error } = useSyncStore();

  const entries = Object.entries(relayStatuses);
  const anyConnecting = entries.some(([, s]) => s === 'connecting');
  const isOnline = liveRelayCount > 0;

  const label = isSyncing
    ? 'Syncing...'
    : error
      ? 'Sync error'
      : anyConnecting && !isOnline
        ? 'Connecting...'
        : isOnline
          ? `${liveRelayCount} relay${liveRelayCount > 1 ? 's' : ''} connected`
          : 'No relays reachable';

  const color = error
    ? 'error.main'
    : isOnline
      ? 'success.main'
      : anyConnecting
        ? 'warning.main'
        : 'text.disabled';

  // Build tooltip showing per-relay status
  const tooltipContent = entries.length
    ? entries
        .map(([url, status]) => {
          const icon =
            status === 'connected'
              ? '✅'
              : status === 'connecting'
                ? '⏳'
                : '❌';
          return `${icon} ${url}`;
        })
        .join('\n')
    : 'No relays configured';

  return (
    <Tooltip
      title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipContent}</span>}
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
        {isSyncing || (anyConnecting && !isOnline) ? (
          <CircularProgress size={12} thickness={5} sx={{ color }} />
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
