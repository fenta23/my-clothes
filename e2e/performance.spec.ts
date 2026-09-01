import { expect, test, type Page } from '@playwright/test'

import { WardrobePage } from './pages/WardrobePage.ts'

/*
 * Messung statt Vermutung: haelt die App bei einem realistisch gefuellten Schrank?
 *
 * Die Kleidungsstuecke werden direkt in IndexedDB geschrieben statt ueber die
 * Oberflaeche - 200 Mal durch das Erfassungs-Sheet zu klicken wuerde Minuten
 * dauern und nichts zusaetzlich beweisen. Die Bilder entstehen im Browser mit
 * Verlaeufen und Formen, damit sie sich aehnlich komprimieren wie echte Fotos;
 * Rauschen waere unrealistisch gross, eine einfarbige Flaeche unrealistisch klein.
 */

const ITEM_COUNT = 200

interface SeedReport {
  thumbBytes: number
  fullBytes: number
  writeMs: number
}

async function seedManyItems(page: Page, count: number): Promise<SeedReport> {
  return page.evaluate(async (count) => {
    const openDb = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        // Ohne Versionsnummer: der Test soll die vorhandene Datenbank oeffnen und
        // nicht bei jedem Schema-Schritt nachgezogen werden muessen.
        const request = indexedDB.open('kleiderschrank')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

    /** Bild mit Verlauf und Formen - komprimiert aehnlich wie ein Foto. */
    const makeJpeg = async (edge: number): Promise<Blob> => {
      const canvas = document.createElement('canvas')
      canvas.width = edge
      canvas.height = edge

      const context = canvas.getContext('2d')!
      const gradient = context.createLinearGradient(0, 0, edge, edge)
      gradient.addColorStop(0, '#8B5CF6')
      gradient.addColorStop(1, '#EC4899')
      context.fillStyle = gradient
      context.fillRect(0, 0, edge, edge)

      for (let i = 0; i < 40; i += 1) {
        context.fillStyle = `hsl(${(i * 37) % 360} 70% ${40 + (i % 30)}%)`
        context.beginPath()
        context.ellipse(
          ((i * 97) % edge),
          ((i * 61) % edge),
          edge / 12,
          edge / 18,
          i,
          0,
          Math.PI * 2,
        )
        context.fill()
      }

      return new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8),
      )
    }

    const [thumb, full] = await Promise.all([makeJpeg(400), makeJpeg(1600)])
    const [thumbBuf, fullBuf] = await Promise.all([thumb.arrayBuffer(), full.arrayBuffer()])

    const db = await openDb()

    const households = await new Promise<{ id: string }[]>((resolve, reject) => {
      const request = db.transaction('households').objectStore('households').getAll()
      request.onsuccess = () => resolve(request.result as { id: string }[])
      request.onerror = () => reject(request.error)
    })

    const lanes = [null, households[0]?.id ?? null, households[1]?.id ?? null]

    const start = performance.now()

    const tx = db.transaction(['items', 'images', 'events'], 'readwrite')
    const items = tx.objectStore('items')
    const images = tx.objectStore('images')
    const events = tx.objectStore('events')

    for (let i = 0; i < count; i += 1) {
      const id = `perf-${i}`
      const at = 1_700_000_000_000 + i

      items.put({
        id,
        title: `Stück ${i}`,
        categoryId: null,
        householdId: lanes[i % 3] ?? null,
        createdAt: at,
        updatedAt: at,
      })

      images.put({
        id,
        full: fullBuf.slice(0),
        fullType: 'image/jpeg',
        thumb: thumbBuf.slice(0),
        thumbType: 'image/jpeg',
      })

      events.put({
        id: `perf-event-${i}`,
        itemId: id,
        timestamp: at,
        kind: 'created',
        fromName: null,
        toName: 'Neu',
      })
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    return {
      thumbBytes: thumb.size,
      fullBytes: full.size,
      writeMs: Math.round(performance.now() - start),
    }
  }, count)
}

const OUTFIT_COUNT = 40
const ITEMS_PER_OUTFIT = 5

/** Muss zu `PREVIEW_MAX_ITEMS` in `src/features/outfits/OutfitList.tsx` passen. */
const PREVIEW_MAX_ITEMS = 3

/**
 * Legt Outfits auf den bereits geschriebenen Stuecken an.
 *
 * Die Uebersicht zeigt je Kachel die ganze Figur - bei 40 Outfits sind das 200
 * Vorschaubilder auf einem Bildschirm. Genau das ist die Zahl, die hier gemessen
 * und nicht angenommen wird.
 */
async function seedOutfits(page: Page): Promise<void> {
  await page.evaluate(
    async ({ outfitCount, perOutfit, itemCount }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('kleiderschrank')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const tx = db.transaction('outfits', 'readwrite')
      const outfits = tx.objectStore('outfits')

      for (let i = 0; i < outfitCount; i += 1) {
        const at = 1_700_000_000_000 + i

        outfits.put({
          id: `perf-outfit-${i}`,
          name: `Outfit ${i}`,
          itemIds: Array.from(
            { length: perOutfit },
            (_, n) => `perf-${(i * perOutfit + n) % itemCount}`,
          ),
          createdAt: at,
          updatedAt: at,
        })
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
    { outfitCount: OUTFIT_COUNT, perOutfit: ITEMS_PER_OUTFIT, itemCount: ITEM_COUNT },
  )
}

test.describe('Verhalten bei vollem Schrank', () => {
  test.setTimeout(180_000)

  test(`traegt ${ITEM_COUNT} Kleidungsstuecke und bleibt bedienbar`, async ({ page }) => {
    const wardrobe = new WardrobePage(page)
    await wardrobe.open()

    const seed = await seedManyItems(page, ITEM_COUNT)

    const startLoad = Date.now()
    await wardrobe.reload()

    // Warten, bis alle Karten im DOM sind - das ist der Moment, ab dem das Kind
    // etwas sieht.
    await expect(page.getByTestId('clothing-card')).toHaveCount(ITEM_COUNT, {
      timeout: 60_000,
    })
    const loadMs = Date.now() - startLoad

    // Reaktion auf eine Eingabe nach dem Laden: der eigentliche Gebrauchswert.
    // Ueber das Page Object statt ueber rohe Kennungen - beim Umbau auf die
    // Seitenleiste war dieser Test der einzige, der brach, weil er daran vorbeigriff.
    const startTap = Date.now()
    await wardrobe.openMenu()
    const tapMs = Date.now() - startTap

    const storage = await page.evaluate(async () => {
      const estimate = await navigator.storage?.estimate?.()

      return { usage: estimate?.usage ?? 0, quota: estimate?.quota ?? 0 }
    })

    const decoded = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLImageElement>('[data-testid="clothing-card"] img')]
          .filter((img) => img.complete && img.naturalWidth > 0).length,
    )

    console.log(
      [
        '',
        '--- Messung ---',
        `Vorschaubild:        ${(seed.thumbBytes / 1024).toFixed(0)} KB`,
        `Original:            ${(seed.fullBytes / 1024).toFixed(0)} KB`,
        `${ITEM_COUNT} Stücke geschrieben: ${seed.writeMs} ms`,
        `Belegt:              ${(storage.usage / 1024 / 1024).toFixed(1)} MB von ${(
          storage.quota /
          1024 /
          1024 /
          1024
        ).toFixed(1)} GB`,
        `Laden bis alle Karten da: ${loadMs} ms`,
        `Reaktion auf Antippen:    ${tapMs} ms`,
        `Geladene Bilder im DOM:   ${decoded} von ${ITEM_COUNT}`,
        '',
      ].join('\n'),
    )

    /*
     * Die wichtigste Zusicherung: es duerfen nur die sichtbaren Bilder geladen
     * werden.
     *
     * Gemessen ohne `loading="lazy"` waren es alle 200 beziehungsweise 500 - jedes
     * 400er-JPEG belegt dekodiert rund 640 KB, das sind ueber 100 MB fuer Bilder,
     * die niemand sieht. Die Ladezeit war dabei uebrigens dieselbe; das Aufschieben
     * kostet nichts und spart alles.
     *
     * Die Grenze liegt bewusst hoch: Browser laden etwas ueber den sichtbaren
     * Bereich hinaus vor, und wie viel genau ist ihre Sache. Der Test soll den
     * Rueckfall auf "alle" erkennen, nicht eine Zahl festschreiben.
     */
    expect(decoded).toBeLessThan(ITEM_COUNT / 2)

    // Grosszuegige Zeitgrenzen: ein Frueherkennungsnetz gegen Verschlechterung,
    // keine Messlatte fuer die absolute Geschwindigkeit. Die Werte hier stammen von
    // einem Mac - ein iPhone 12 braucht laenger.
    expect(loadMs).toBeLessThan(30_000)
    expect(tapMs).toBeLessThan(5_000)
  })

  test(`zeigt ${OUTFIT_COUNT} Outfits, ohne alle Vorschaubilder zu laden`, async ({
    page,
  }) => {
    /*
     * Die Uebersicht zeigt je Outfit die ganze Figur statt nur dreier Bilder - das
     * liest sich besser, verschiebt aber die Last. Bei 40 Outfits mit je fuenf
     * Teilen haengen 200 Bilder im Baum. Ohne Messung waere das eine Behauptung.
     */
    const wardrobe = new WardrobePage(page)
    await wardrobe.open()

    await seedManyItems(page, ITEM_COUNT)
    await seedOutfits(page)
    await wardrobe.reload()

    const start = Date.now()
    const outfits = await wardrobe.showOutfits()
    await expect(page.getByTestId('outfit-karte')).toHaveCount(OUTFIT_COUNT, {
      timeout: 60_000,
    })
    const loadMs = Date.now() - start

    await expect(outfits.card('Outfit 0')).toBeVisible()

    const gesamt = OUTFIT_COUNT * ITEMS_PER_OUTFIT
    const decoded = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLImageElement>('[data-testid="figur-teil"] img')]
          .filter((img) => img.complete && img.naturalWidth > 0).length,
    )

    console.log(
      [
        '',
        '--- Messung Outfits ---',
        `Kacheln:                  ${OUTFIT_COUNT}`,
        `Teile insgesamt:          ${gesamt}`,
        `Laden bis alle Kacheln da: ${loadMs} ms`,
        `Geladene Bilder im DOM:   ${decoded} von ${gesamt}`,
        '',
      ].join('\n'),
    )

    /*
     * Hier greift eine andere Schranke als bei den Bahnen, und das ist kein
     * Versehen: auf einem breiten Fenster passen alle 40 Kacheln gleichzeitig auf
     * den Schirm - `loading="lazy"` hat dort nichts auszulassen. Was die Last
     * begrenzt, ist der Deckel von drei Teilen je Kachel.
     *
     * Ohne ihn waren es gemessen alle 200 auf einmal, jedes 400er-JPEG dekodiert
     * rund 640 KB. Auf dem iPhone-Fenster kommt die Vorausschau des Browsers dazu:
     * dort sind es rund 42.
     */
    expect(decoded).toBeLessThanOrEqual(OUTFIT_COUNT * PREVIEW_MAX_ITEMS)
    expect(decoded).toBeLessThan(gesamt)
    expect(loadMs).toBeLessThan(30_000)
  })
})
