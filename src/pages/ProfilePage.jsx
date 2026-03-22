import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { clearRelayCache, getBestRelays } from '../services/nostr/relayHealth';

import { useNavigate } from 'react-router-dom';
import { npubFromHex, nsecFromHex } from '../services/nostr/identity';
import useIdentityStore from '../stores/useIdentityStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { identity, setDisplayName, setRelays } = useIdentityStore();

  const [displayName, setDisplayNameLocal] = useState(
    identity?.displayName ?? ''
  );
  const [relayInput, setRelayInput] = useState(
    (identity?.relays ?? []).join('\n')
  );
  const [saved, setSaved] = useState(false);
  const [nsecVisible, setNsecVisible] = useState(false);
  const [copied, setCopied] = useState('');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);

  if (!identity) return null;

  const npub = npubFromHex(identity.pubkeyHex);
  const nsec = nsecFromHex(identity.privkeyHex);

  const handleSave = async () => {
    await setDisplayName(displayName.trim() || 'Anonymous');
    const relays = relayInput
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.startsWith('wss://'));
    await setRelays(relays);
    setSaved(true);
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleAutoDetect = async () => {
    setProbing(true);
    setProbeResult(null);
    clearRelayCache();
    try {
      const best = await getBestRelays(3);
      setRelayInput(best.join('\n'));
      setProbeResult(`Found ${best.length} fast relays`);
    } catch {
      setProbeResult('Could not reach nostr.watch — try again');
    } finally {
      setProbing(false);
    }
  };

  const KeyField = ({ label, value, masked }) => (
    <Box>
      <Typography
        variant='caption'
        fontWeight={600}
        color='text.secondary'
        sx={{
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 0.5,
          display: 'block',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default', // ← was 'grey.50', now theme-aware
        }}
      >
        <Typography
          variant='caption'
          sx={{
            flex: 1,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          {masked && !nsecVisible ? '•'.repeat(32) : value}
        </Typography>
        <Tooltip title={copied === label ? 'Copied!' : 'Copy'}>
          <IconButton
            size='small'
            onClick={() => handleCopy(value, label)}
            sx={{ p: 0.5, flexShrink: 0 }}
          >
            <ContentCopyIcon
              sx={{
                fontSize: 14,
                color: copied === label ? 'success.main' : 'text.disabled',
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>
      {masked && (
        <Button
          size='small'
          sx={{ mt: 0.5, fontSize: '0.72rem' }}
          onClick={() => setNsecVisible((v) => !v)}
        >
          {nsecVisible ? 'Hide private key' : 'Reveal private key'}
        </Button>
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 2 }}>
      <Box sx={{ maxWidth: 540, mx: 'auto' }}>
        {/* Back */}
        <Box sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        </Box>

        <Typography variant='h2' sx={{ mb: 3 }}>
          Profile
        </Typography>

        <Stack spacing={3}>
          {/* Identity */}
          <Paper elevation={1} sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant='h3' sx={{ mb: 2 }}>
              Identity
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size='small'
                label='Display name'
                value={displayName}
                onChange={(e) => setDisplayNameLocal(e.target.value)}
              />
              <KeyField label='Public key (npub)' value={npub} />
              <KeyField label='Private key (nsec)' value={nsec} masked />
            </Stack>
          </Paper>

          {/* Relays */}
          <Paper elevation={1} sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant='h3' sx={{ mb: 0.5 }}>
              Relays
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              One relay URL per line (must start with wss://)
            </Typography>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
            >
              <Button
                size='small'
                variant='outlined'
                startIcon={
                  probing ? (
                    <CircularProgress size={14} />
                  ) : (
                    <SpeedIcon sx={{ fontSize: 16 }} />
                  )
                }
                onClick={handleAutoDetect}
                disabled={probing}
              >
                {probing ? 'Probing relays…' : 'Auto-detect fastest'}
              </Button>
              {probeResult && (
                <Typography variant='caption' color='success.main'>
                  ✅ {probeResult}
                </Typography>
              )}
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={3}
              size='small'
              value={relayInput}
              onChange={(e) => setRelayInput(e.target.value)}
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
              }}
              placeholder={'wss://relay.damus.io\nwss://nos.lol'}
            />
          </Paper>

          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ alignSelf: 'flex-start' }}
          >
            Save changes
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message='Profile saved'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
