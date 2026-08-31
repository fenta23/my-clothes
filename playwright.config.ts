import { defineConfig, devices } from '@playwright/test'

/*
 * Drag & Drop laesst sich weder in jsdom noch durch Nachdenken pruefen. Diese
 * Konfiguration faehrt den echten Dev-Server hoch und testet in zwei Umgebungen:
 * Desktop mit Maus und iPhone mit Touch - die beiden Faelle, die tatsaechlich
 * unterschiedlich brechen.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: 'https://localhost:5173/my-clothes/',
    // Der Dev-Server nutzt ein selbstsigniertes Zertifikat.
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'desktop-maus',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iphone-touch',
      // WebKit mit Touch-Emulation - so nah an Safari auf dem iPhone, wie es
      // ohne echtes Geraet geht.
      use: { ...devices['iPhone 15 Pro'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:5173/my-clothes/',
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 60_000,
  },
})
