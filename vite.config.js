import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/worknote/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'worknote-favicon.svg',
        'worknote-app-icon.svg',
        'worknote-logo-light.svg',
        'worknote-logo-dark.svg',
      ],
      manifest: {
        name: 'WorkNote',
        short_name: 'WorkNote',
        description: 'Decentralized · Serverless · Free forever',
        theme_color: '#2563eb',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'worknote-app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Don't cache Nostr relay WebSocket traffic
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Cache Google Fonts if used
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
        ],
      },
      devOptions: {
        // Enable PWA in dev so you can test install prompt locally
        enabled: true,
        type: 'module',
      },
    }),
  ],
  optimizeDeps: {
    include: ['@blocknote/core', '@blocknote/react', '@blocknote/mantine'],
    exclude: ['@noble/hashes'],
  },
  resolve: {
    conditions: ['browser', 'module', 'import', 'default'],
  },
});
