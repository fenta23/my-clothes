import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

/*
 * GitHub Pages liefert das Projekt unter einem Unterpfad aus. Basis, Manifest-Scope
 * und Service-Worker-Fallback muessen alle darauf zeigen - sonst laedt die
 * installierte App eine weisse Seite.
 */
const BASE = '/my-clothes/'

export default defineConfig({
  base: BASE,

  plugins: [
    react(),

    /*
     * HTTPS im Dev-Server ist keine Kosmetik: Service Worker und "Zum Home-Bildschirm"
     * verweigern auf http://192.168.x.x lautlos den Dienst. Ohne das sucht man den
     * Fehler stundenlang im Manifest.
     */
    basicSsl(),

    VitePWA({
      /*
       * 'prompt' statt 'autoUpdate': eine Home-Screen-App wird nicht neu geladen,
       * nur weil im Hintergrund neue Dateien liegen - sie laeuft tage- oder
       * wochenlang weiter mit der alten Fassung. Mit 'prompt' meldet sich die App
       * selbst, sobald eine neue Version bereitsteht.
       */
      registerType: 'prompt',

      // Registriert wird von Hand in useAppUpdate; ohne das entstuende eine
      // zweite, konkurrierende Registrierung.
      injectRegister: null,

      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kleiderschrank',
        short_name: 'Kleiderschrank',
        description:
          'Kleidung fotografieren, kategorisieren und zwischen zwei Haushalten hin- und herschieben.',
        lang: 'de',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#efe9fb',
        theme_color: '#efe9fb',
        icons: [
          { src: `${BASE}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${BASE}icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: `${BASE}index.html`,
      },
      // Service Worker auch im Dev-Server, damit das Offline-Verhalten frueh testbar ist.
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
    }),
  ],

  server: { host: true },

  test: {
    /*
     * Ohne diese Einschraenkung sammelt Vitest auch e2e/*.spec.ts ein und
     * scheitert an Playwrights test.beforeEach - die beiden Laeufe muessen
     * sich sauber trennen.
     */
    include: ['src/**/*.test.{ts,tsx}'],

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
