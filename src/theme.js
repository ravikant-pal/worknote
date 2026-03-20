import { createTheme } from '@mui/material/styles';

export default function buildTheme(mode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#2563eb',
        light: '#3b82f6',
        dark: '#1d4ed8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#7c3aed',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0f172a' : '#f8fafc',
        paper: isDark ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#475569',
        disabled: isDark ? '#475569' : '#94a3b8',
      },
      divider: isDark ? '#1e293b' : '#e2e8f0',
      error: { main: '#dc2626' },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      fontSize: 14,
      h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.125rem', fontWeight: 600 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem' },
    },
    shape: { borderRadius: 10 },
    shadows: [
      'none',
      '0 1px 2px rgba(0,0,0,0.06)',
      '0 1px 4px rgba(0,0,0,0.08)',
      '0 2px 8px rgba(0,0,0,0.08)',
      '0 4px 16px rgba(0,0,0,0.08)',
      '0 8px 24px rgba(0,0,0,0.10)',
      ...Array(19).fill('none'),
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500, borderRadius: 8 },
        },
        defaultProps: { disableElevation: true },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
          },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true, placement: 'bottom' },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: isDark ? '#334155' : '#e2e8f0' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&.Mui-selected': {
              backgroundColor: isDark ? '#1d3a6e' : '#eff6ff',
              '&:hover': { backgroundColor: isDark ? '#1e3a6e' : '#dbeafe' },
            },
          },
        },
      },
    },
  });
}
