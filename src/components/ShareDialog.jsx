import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { hexFromNpub } from '../services/nostr/identity';
import useIdentityStore from '../stores/useIdentityStore';
import useNotesStore from '../stores/useNotesStore';
import useSyncStore from '../stores/useSyncStore';

export default function ShareDialog({ open, onClose, noteId }) {
  const { notes, shareNote, addWriter, removeWriter } = useNotesStore();
  const note = notes.find((n) => n.id === noteId);

  const [shareUrl, setShareUrl] = useState('');
  const [npubInput, setNpubInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(note?.isPublic ?? false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const { identity } = useIdentityStore();
  const { sync } = useSyncStore();

  if (!note) return null;

  const handleTogglePublic = async (e) => {
    const val = e.target.checked;
    setIsPublic(val);
    setPublishing(true);
    setPublished(false);
    try {
      const url = await shareNote(noteId, val);
      setShareUrl(url);
      if (identity) {
        await sync(identity);
        setPublished(true);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateLink = async () => {
    setPublishing(true);
    setPublished(false);
    try {
      const url = await shareNote(noteId, isPublic);
      setShareUrl(url);
      if (identity) {
        await sync(identity);
        setPublished(true);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddWriter = async () => {
    const trimmed = npubInput.trim();
    if (!trimmed) return;
    let pubkey = trimmed;
    if (trimmed.startsWith('npub1')) {
      try {
        pubkey = hexFromNpub(trimmed);
      } catch {
        return;
      }
    }
    if (!pubkey) return;
    await addWriter(noteId, pubkey);
    setNpubInput('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xs'
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}
    >
      <DialogTitle sx={{ typography: 'h3', pb: 1 }}>Share note</DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        <Stack spacing={2.5}>
          {/* Public toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: isPublic ? 'primary.main' : 'divider',
            }}
          >
            <Box>
              <Typography variant='body2' fontWeight={500} color='text.primary'>
                {isPublic ? 'Public note' : 'Private note'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {isPublic
                  ? 'Anyone can find and read this note'
                  : 'Only accessible via link'}
              </Typography>
            </Box>
            <Switch
              checked={isPublic}
              onChange={handleTogglePublic}
              size='small'
            />
          </Box>

          {/* Share link */}
          <Box>
            <Typography
              variant='caption'
              fontWeight={600}
              color='text.secondary'
              sx={{
                mb: 1,
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Share link
            </Typography>
            {shareUrl ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <LinkIcon
                    sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }}
                  />
                  <Typography
                    variant='caption'
                    noWrap
                    sx={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    {shareUrl}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                    <IconButton
                      size='small'
                      onClick={handleCopy}
                      sx={{ p: 0.25 }}
                    >
                      <ContentCopyIcon
                        sx={{
                          fontSize: 14,
                          color: copied ? 'success.main' : 'text.secondary',
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                </Box>
                {/* Publish status */}
                <Typography
                  variant='caption'
                  sx={{
                    mt: 0.75,
                    display: 'block',
                    color: publishing
                      ? 'text.disabled'
                      : published
                        ? 'success.main'
                        : 'warning.main',
                  }}
                >
                  {publishing
                    ? '⏳ Publishing to network…'
                    : published
                      ? '✅ Published — link is ready to share'
                      : '⚠️ Not yet published to network'}
                </Typography>
              </Box>
            ) : (
              <Button
                variant='outlined'
                size='small'
                startIcon={
                  publishing ? <CircularProgress size={14} /> : <LinkIcon />
                }
                onClick={handleGenerateLink}
                disabled={publishing}
                fullWidth
              >
                {publishing ? 'Publishing…' : 'Generate link'}
              </Button>
            )}
          </Box>

          <Divider />

          {/* Collaborators */}
          <Box>
            <Typography
              variant='caption'
              fontWeight={600}
              color='text.secondary'
              sx={{
                mb: 1,
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Collaborators (edit access)
            </Typography>

            {(note.writerPubkeys ?? []).length > 0 && (
              <Box
                sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
              >
                {note.writerPubkeys.map((pk) => (
                  <Chip
                    key={pk}
                    label={`${pk.slice(0, 8)}...`}
                    size='small'
                    onDelete={() => removeWriter(noteId, pk)}
                    sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size='small'
                fullWidth
                placeholder='Paste npub or pubkey hex'
                value={npubInput}
                onChange={(e) => setNpubInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWriter()}
                InputProps={{
                  sx: { fontSize: '0.8rem', fontFamily: 'monospace' },
                }}
              />
              <Tooltip title='Add collaborator'>
                <IconButton
                  onClick={handleAddWriter}
                  disabled={!npubInput.trim()}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <PersonAddIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
