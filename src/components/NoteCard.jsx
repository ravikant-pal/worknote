import LockIcon from '@mui/icons-material/Lock';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PublicIcon from '@mui/icons-material/Public';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function NoteCard({ note, isActive, onClick, onMenuClick }) {
  // Extract plain text preview from BlockNote JSON
  const preview = (() => {
    try {
      const blocks = JSON.parse(note.content);
      for (const block of blocks) {
        const text = (block.content ?? [])
          .filter((i) => i.type === 'text')
          .map((i) => i.text)
          .join('');
        if (text.trim()) return text.trim();
      }
      return 'No content';
    } catch {
      return 'No content';
    }
  })();

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: isActive ? 'primary.main' : 'transparent',
        '&:hover': {
          bgcolor: isActive ? 'primary.main' : 'action.hover',
        },
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        transition: 'background 0.15s',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          {note.isPublic ? (
            <PublicIcon
              sx={{
                fontSize: 11,
                color: isActive ? 'primary.contrastText' : 'text.disabled',
                flexShrink: 0,
              }}
            />
          ) : (
            <LockIcon
              sx={{
                fontSize: 11,
                color: isActive ? 'primary.contrastText' : 'text.disabled',
                flexShrink: 0,
              }}
            />
          )}
          <Typography
            variant='body2'
            noWrap
            sx={{
              fontWeight: 500,
              color: isActive ? 'primary.contrastText' : 'text.primary',
            }}
          >
            {note.title || 'Untitled'}
          </Typography>
        </Box>
        <Typography
          variant='caption'
          noWrap
          sx={{
            color: isActive ? 'rgba(255,255,255,0.7)' : 'text.secondary',
            display: 'block',
          }}
        >
          {preview}
        </Typography>
        <Typography
          variant='caption'
          sx={{
            color: isActive ? 'rgba(255,255,255,0.5)' : 'text.disabled',
            fontSize: '0.7rem',
          }}
        >
          {timeAgo(note.updatedAt)}
        </Typography>
      </Box>

      <Tooltip title='More options'>
        <IconButton
          size='small'
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.(e, note);
          }}
          sx={{
            opacity: 0,
            '.MuiBox-root:hover &': { opacity: 1 },
            color: isActive ? 'primary.contrastText' : 'text.secondary',
            p: 0.25,
          }}
        >
          <MoreHorizIcon fontSize='small' />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
