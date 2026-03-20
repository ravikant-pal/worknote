import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Avatar, Box, Divider, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useIdentityStore from '../../stores/useIdentityStore';
import useNotesStore from '../../stores/useNotesStore';
import useThemeStore from '../../stores/useThemeStore';
import SyncStatusBar from '../SyncStatusBar';
import FolderTree from './FolderTree';
import NoteList from './NoteList';

const SIDEBAR_WIDTH = 260;

export default function Sidebar({ onNoteSelect, onClose }) {
  const navigate = useNavigate();
  const { identity } = useIdentityStore();
  const { activeFolderId } = useNotesStore();
  const { mode, toggleMode } = useThemeStore();
  const isDark = mode === 'dark';

  const initials =
    identity?.displayName
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?';

  return (
    <Box
      sx={{
        width: onClose ? '100%' : SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: onClose ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? '#1e293b' : '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
            flex: 1,
          }}
        >
          <Box
            component='img'
            src={
              isDark
                ? `${import.meta.env.BASE_URL}worknote-logo-dark.svg`
                : `${import.meta.env.BASE_URL}worknote-logo-light.svg`
            }
            alt='WorkNote'
            sx={{ height: 48, maxWidth: 160, objectFit: 'contain' }}
          />
        </Box>

        {/* Actions — always right-aligned, never pushed */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
            <IconButton size='small' onClick={toggleMode} sx={{ p: 0.5 }}>
              {isDark ? (
                <LightModeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              )}
            </IconButton>
          </Tooltip>

          {onClose && (
            <Tooltip title='Close'>
              <IconButton size='small' onClick={onClose} sx={{ p: 0.5 }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title='Profile'>
            <IconButton
              size='small'
              onClick={() => {
                navigate('/profile');
                onClose?.();
              }}
              sx={{ p: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'primary.main',
                  fontSize: '0.7rem',
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Folders */}
      <Box sx={{ pt: 1 }}>
        <FolderTree />
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Notes */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NoteList folderId={activeFolderId} onNoteSelect={onNoteSelect} />
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <SyncStatusBar />
      </Box>
    </Box>
  );
}
