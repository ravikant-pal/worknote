import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import useNotesStore from '../../stores/useNotesStore';

function FolderRow({ folder, isActive, onClick, onMenu }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: isActive ? 'primary.50' : 'transparent',
        '&:hover': { bgcolor: isActive ? 'primary.50' : 'action.hover' },
        '& .menu-btn': { opacity: 0 },
        '&:hover .menu-btn': { opacity: 1 },
      }}
    >
      {isActive ? (
        <FolderOpenIcon sx={{ fontSize: 16, color: 'primary.main' }} />
      ) : (
        <FolderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      )}
      <Typography
        variant='body2'
        noWrap
        sx={{
          flex: 1,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? 'primary.main' : 'text.primary',
        }}
      >
        {folder.name}
      </Typography>
      <IconButton
        className='menu-btn'
        size='small'
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e, folder);
        }}
        sx={{ p: 0.25 }}
      >
        <MoreHorizIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

export default function FolderTree() {
  const {
    folders,
    activeFolderId,
    setActiveFolder,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useNotesStore();

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuFolder, setMenuFolder] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleMenu = (e, folder) => {
    setMenuAnchor(e.currentTarget);
    setMenuFolder(folder);
  };

  const handleRenameOpen = () => {
    setRenameValue(menuFolder.name);
    setRenameOpen(true);
    setMenuAnchor(null);
  };

  const handleRenameConfirm = async () => {
    if (renameValue.trim())
      await renameFolder(menuFolder.id, renameValue.trim());
    setRenameOpen(false);
  };

  const handleDelete = async () => {
    await deleteFolder(menuFolder.id);
    setMenuAnchor(null);
  };

  const handleNewFolder = async () => {
    if (newFolderName.trim()) await createFolder(newFolderName.trim());
    setNewFolderName('');
    setNewFolderOpen(false);
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Folders
        </Typography>
        <Tooltip title='New folder'>
          <IconButton
            size='small'
            onClick={() => setNewFolderOpen(true)}
            sx={{ p: 0.25 }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* All Notes row */}
      <Box
        onClick={() => setActiveFolder(null)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          cursor: 'pointer',
          mx: 1,
          bgcolor: activeFolderId === null ? 'primary.50' : 'transparent',
          '&:hover': {
            bgcolor: activeFolderId === null ? 'primary.50' : 'action.hover',
          },
        }}
      >
        <FolderOpenIcon
          sx={{
            fontSize: 16,
            color: activeFolderId === null ? 'primary.main' : 'text.secondary',
          }}
        />
        <Typography
          variant='body2'
          sx={{
            fontWeight: activeFolderId === null ? 600 : 400,
            color: activeFolderId === null ? 'primary.main' : 'text.primary',
          }}
        >
          All Notes
        </Typography>
      </Box>

      {/* Folder list */}
      <Box sx={{ px: 1 }}>
        {folders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            isActive={activeFolderId === folder.id}
            onClick={() => setActiveFolder(folder.id)}
            onMenu={handleMenu}
          />
        ))}
      </Box>

      {/* Folder context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 150 } }}
      >
        <MenuItem dense onClick={handleRenameOpen}>
          Rename
        </MenuItem>
        <MenuItem dense onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ typography: 'h3', pb: 1 }}>
          Rename folder
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            autoFocus
            fullWidth
            size='small'
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
            placeholder='Folder name'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleRenameConfirm}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* New folder dialog */}
      <Dialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ typography: 'h3', pb: 1 }}>New folder</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            autoFocus
            fullWidth
            size='small'
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewFolder()}
            placeholder='Folder name'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewFolderOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleNewFolder}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
