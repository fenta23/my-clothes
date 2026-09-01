import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, join, resolve } from 'node:path'
import type { AddressInfo } from 'node:net'

/*
 * Prueft den Update-Weg wirklich, statt nur das Banner zu rendern.
 *
 * Der Ablauf ist der einer echten Neuveroeffentlichung: gebaute App ausliefern,
 * installieren lassen, dann eine veraenderte sw.js ausliefern und die App
 * nachfragen lassen. Erst wenn der Browser daraufhin eine wartende Fassung meldet
 * und das Banner erscheint, ist der Mechanismus bewiesen.
 *
 * Ein eigener Server statt des Dev-Servers, weil nur der Produktions-Build einen
 * echten Service Worker mit Precache-Liste enthaelt. http://127.0.0.1 gilt als
 * sicherer Kontext, Service Worker sind dort also erlaubt.
 */

const DIST = resolve(import.meta.dirname, '../dist')
const BASE = '/my-clothes/'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

/** Wird an sw.js angehaengt, um eine neue Veroeffentlichung vorzutaeuschen. */
let deployMarker = ''

let server: Server
let origin: string

test.beforeAll(async () => {
  // Frisch bauen, damit der Test nie gegen einen veralteten dist-Ordner laeuft.
  execFileSync('npx', ['vite', 'build'], { cwd: resolve(DIST, '..'), stdio: 'ignore' })

  server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const relative = url.pathname.startsWith(BASE)
        ? url.pathname.slice(BASE.length)
        : url.pathname.slice(1)

      const file = join(DIST, relative === '' ? 'index.html' : relative)

      try {
        let body = await readFile(file)

        // Genau hier entsteht die "neue Version": andere Bytes in sw.js.
        if (file.endsWith('sw.js') && deployMarker) {
          body = Buffer.concat([body, Buffer.from(`\n// ${deployMarker}\n`)])
        }

        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
          // Ohne das liefert der Browser die alte sw.js aus seinem Cache.
          'Cache-Control': 'no-store',
        })
        res.end(body)
      } catch {
        res.writeHead(404).end('nicht gefunden')
      }
    })()
  })

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test.afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()))
})

test.beforeEach(async ({ page }) => {
  deployMarker = ''

  await page.goto(`${origin}${BASE}`)
  await expect(page.getByTestId('wardrobe')).toBeVisible()

  // Erst die Installation abwarten.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))

  /*
   * Dann einmal neu laden. Beim ersten Aufruf kontrolliert ein frisch
   * installierter Service Worker die Seite noch nicht - genau deshalb bewirkte
   * die vorherige Einstellung 'autoUpdate' in der laufenden App nichts. Ohne
   * kontrollierte Seite gaebe es beim Update auch keine wartende Fassung,
   * sondern nur eine erste, und es wuerde nie ein Banner erscheinen.
   */
  await page.reload()
  await expect(page.getByTestId('wardrobe')).toBeVisible()

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 20_000,
  })
})

/** Stoesst dieselbe Pruefung an, die die App im Hintergrund selbst durchfuehrt. */
async function checkForUpdate(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update()
  })
}

test('zeigt ohne neue Veroeffentlichung kein Banner', async ({ page }) => {
  await checkForUpdate(page)

  // Ein Banner ohne Anlass waere schlimmer als keines.
  await expect(page.getByTestId('update-banner')).toBeHidden()
})

test('meldet eine neue Veroeffentlichung', async ({ page }) => {
  deployMarker = 'version-2'
  await checkForUpdate(page)

  await expect(page.getByTestId('update-banner')).toBeVisible()
  await expect(page.getByTestId('update-banner')).toContainText('Neue Version verfügbar')
})

test('uebernimmt die neue Fassung auf Zuruf', async ({ page }) => {
  deployMarker = 'version-2'
  await checkForUpdate(page)
  await expect(page.getByTestId('update-banner')).toBeVisible()

  await page.getByTestId('update-neu-laden').click()

  // Nach dem Neuladen kontrolliert die neue Fassung die Seite, das Banner ist weg.
  await expect(page.getByTestId('wardrobe')).toBeVisible()
  await expect(page.getByTestId('update-banner')).toBeHidden()
})

test('laesst sich ausblenden, ohne neu zu laden', async ({ page }) => {
  deployMarker = 'version-2'
  await checkForUpdate(page)
  await expect(page.getByTestId('update-banner')).toBeVisible()

  await page.getByTestId('update-ausblenden').click()

  await expect(page.getByTestId('update-banner')).toBeHidden()
  // Die App laeuft unveraendert weiter - niemand wird zum Neuladen gezwungen.
  await expect(page.getByTestId('wardrobe')).toBeVisible()
})

test('behaelt die Kleidung ueber ein Update hinweg', async ({ page }) => {
  const { WardrobePage } = await import('./pages/WardrobePage.ts')
  const wardrobe = new WardrobePage(page)

  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.inbox.expectCount(1)

  deployMarker = 'version-2'
  await checkForUpdate(page)
  await page.getByTestId('update-neu-laden').click()

  // Ein Update tauscht Programmcode aus, nicht die Daten in IndexedDB.
  await expect(page.getByTestId('wardrobe')).toBeVisible()
  await wardrobe.inbox.expectCount(1)
  await expect(wardrobe.card('Lieblingshose')).toBeVisible()
})
