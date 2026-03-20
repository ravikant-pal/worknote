import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { Box } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';
import useThemeStore from '../stores/useThemeStore';
import { resolveImage } from './resolveImage';
import { uploadImage } from './uploadImage';

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
});

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Props:
 *   content        — BlockNote JSON string ('' for new notes)
 *   onChange(json) — called on every edit with the updated JSON string
 *   readOnly       — boolean, disables editing
 *   noteId         — used to reset editor when switching notes
 */
export default function WorkNoteEditor({
  content,
  onChange,
  readOnly = false,
  noteId,
}) {
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Parse initial content safely
  const initialContent = useMemo(() => {
    if (!content) return undefined;
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }, [noteId]); // re-parse only when note switches

  const editor = useCreateBlockNote({
    schema,
    initialContent,
    uploadFile: uploadImage,
    resolveFileUrl: resolveImage,
  });

  // When note switches, replace editor content
  const prevNoteId = useRef(noteId);
  useEffect(() => {
    if (prevNoteId.current === noteId) return;
    prevNoteId.current = noteId;
    try {
      const blocks = content ? JSON.parse(content) : [];
      editor.replaceBlocks(
        editor.document,
        blocks.length ? blocks : [{ type: 'paragraph', content: [] }]
      );
    } catch {
      editor.replaceBlocks(editor.document, [
        { type: 'paragraph', content: [] },
      ]);
    }
  }, [noteId]);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        height: '100%',
        '--bn-colors-editor-background': isDark ? '#0f172a' : '#ffffff',
        '--bn-colors-editor-text': isDark ? '#f1f5f9' : '#0f172a',
        '--bn-colors-menu-background': isDark ? '#1e293b' : '#ffffff',
        '--bn-colors-menu-text': isDark ? '#f1f5f9' : '#0f172a',
        '--bn-colors-tooltip-background': isDark ? '#334155' : '#1e293b',
        '--bn-colors-tooltip-text': isDark ? '#f1f5f9' : '#f8fafc',
        '--bn-colors-hovered-background': isDark ? '#1e293b' : '#f1f5f9',
        '--bn-colors-selected-background': isDark ? '#1d3a6e' : '#eff6ff',
        '--bn-colors-disabled-background': isDark ? '#1e293b' : '#f8fafc',
        '--bn-colors-shadow': isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)',
        '--bn-colors-border': isDark ? '#334155' : '#e2e8f0',
        '--bn-colors-side-menu': isDark ? '#475569' : '#94a3b8',
        '--bn-colors-highlights-gray-background': isDark
          ? '#1e293b'
          : '#f1f5f9',
        '--bn-colors-highlights-gray-text': isDark ? '#94a3b8' : '#475569',
        '--bn-colors-highlights-blue-background': isDark
          ? '#1d3a6e'
          : '#eff6ff',
        '--bn-colors-highlights-blue-text': isDark ? '#93c5fd' : '#1d4ed8',
        '--bn-colors-highlights-red-background': isDark ? '#450a0a' : '#fef2f2',
        '--bn-colors-highlights-red-text': isDark ? '#fca5a5' : '#dc2626',
        '--bn-colors-highlights-green-background': isDark
          ? '#052e16'
          : '#f0fdf4',
        '--bn-colors-highlights-green-text': isDark ? '#86efac' : '#16a34a',
        '--bn-colors-highlights-yellow-background': isDark
          ? '#422006'
          : '#fefce8',
        '--bn-colors-highlights-yellow-text': isDark ? '#fcd34d' : '#ca8a04',
        '--bn-font-family': '"Inter", "Segoe UI", system-ui, sans-serif',
        '--bn-border-radius': '8px',
        '& .bn-editor': { padding: '0 !important' },
        '& .bn-container': { height: '100%' },
        '& .bn-container, & .bn-editor, & .ProseMirror': {
          backgroundColor: 'transparent !important',
        },
        background: 'transparent',
      }}
    >
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={() => {
          const json = JSON.stringify(editor.document);
          onChangeRef.current?.(json);
        }}
        theme={isDark ? 'dark' : 'light'}
      />
    </Box>
  );
}
