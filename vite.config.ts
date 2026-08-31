import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),

    /*
     * HTTPS im Dev-Server ist keine Kosmetik: Service Worker und "Zum Home-Bildschirm"
     * verweigern auf http://192.168.x.x lautlos den Dienst. Ohne das sucht man den
     * Fehler stundenlang im Manifest.
     */
    basicSsl(),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kleiderschrank',
        short_name: 'Kleiderschrank',
        description:
          'Kleidung fotografieren, kategorisieren und zwischen zwei Haushalten hin- und herschieben.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#efe9fb',
        theme_color: '#efe9fb',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },
      // Service Worker auch im Dev-Server, damit das Offline-Verhalten frueh testbar ist.
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
    }),
  ],

  server: { host: true },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
})
