import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Box,
  Button,
  Chip,
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

export default function ShareDialog({ open, onClose, noteId }) {
  const { notes, shareNote, addWriter, removeWriter } = useNotesStore();
  const { identity } = useIdentityStore();
  const note = notes.find((n) => n.id === noteId);

  const [shareUrl, setShareUrl] = useState('');
  const [npubInput, setNpubInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(note?.isPublic ?? false);

  if (!note) return null;

  const handleTogglePublic = async (e) => {
    const val = e.target.checked;
    setIsPublic(val);
    const url = await shareNote(noteId, val);
    setShareUrl(url);
  };

  const handleGenerateLink = async () => {
    const url = await shareNote(noteId, isPublic);
    setShareUrl(url);
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
      PaperProps={{ sx: { borderRadius: 3 } }}
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
              bgcolor: isPublic ? 'primary.50' : 'grey.50',
              border: '1px solid',
              borderColor: isPublic ? 'primary.200' : 'divider',
            }}
          >
            <Box>
              <Typography variant='body2' fontWeight={500}>
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <LinkIcon
                  sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }}
                />
                <Typography
                  variant='caption'
                  noWrap
                  sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.7rem' }}
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
            ) : (
              <Button
                variant='outlined'
                size='small'
                startIcon={<LinkIcon />}
                onClick={handleGenerateLink}
                fullWidth
              >
                Generate link
              </Button>
            )}
          </Box>

          <Divider />

          {/* Write access */}
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

            {/* Existing writers */}
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

            {/* Add writer */}
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
