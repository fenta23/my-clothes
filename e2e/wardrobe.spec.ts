import { expect, test } from '@playwright/test'

import { pointerDrag } from './pages/gestures.ts'
import { WardrobePage } from './pages/WardrobePage.ts'

/*
 * Der Weg, den ein Kind tatsaechlich geht: Foto hinzufuegen, einer Bahn zuordnen,
 * spaeter woanders hinschieben - und das Ganze uebersteht einen Neustart.
 */

let wardrobe: WardrobePage

test.beforeEach(async ({ page }) => {
  wardrobe = new WardrobePage(page)
  await wardrobe.open()
})

test('startet mit zwei Haushalten und einer leeren Mitte', async () => {
  await expect(wardrobe.top.title).toHaveText('Haushalt 1')
  await expect(wardrobe.bottom.title).toHaveText('Haushalt 2')

  await wardrobe.top.expectCount(0)
  await wardrobe.inbox.expectCount(0)
  await wardrobe.bottom.expectCount(0)
})

test.describe('Die Seite steht still', () => {
  /*
   * Prueft die Ursache, nicht das Symptom: solange das Dokument gar nicht
   * scrollbar ist, kann auch keine Geste es verschieben - egal wo man anfasst.
   */
  test('das Dokument ist ueberhaupt nicht scrollbar', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement
      if (!el) throw new Error('Kein scrollendes Element')

      return {
        vertikal: el.scrollHeight - el.clientHeight,
        waagerecht: el.scrollWidth - el.clientWidth,
      }
    })

    expect(overflow.vertikal).toBeLessThanOrEqual(0)
    expect(overflow.waagerecht).toBeLessThanOrEqual(0)
  })

  test('senkrechtes Ziehen an der Kopfzeile verschiebt nichts', async ({ page }) => {
    // Genau die Geste, die auf dem iPhone 12 die ganze Seite verschoben hat.
    const titel = page.getByText('Kleiderschrank', { exact: true })
    await pointerDrag(page, titel, wardrobe.bottom.root, 'touch')

    const scrollTop = await page.evaluate(() => document.scrollingElement?.scrollTop ?? -1)
    expect(scrollTop).toBe(0)
  })

  test('bleibt auch mit vielen Kleidungsstuecken unbeweglich', async () => {
    // Volle Bahnen sind der Fall, in dem Ueberlauf am ehesten entsteht.
    await wardrobe.addItem('Hose eins', { category: 'Hose' })
    await wardrobe.addItem('Hose zwei', { category: 'Hose' })
    await wardrobe.addItem('Shirt eins', { category: 'T-Shirt' })

    const overflow = await wardrobe.documentOverflow()
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('laesst die Bahnen weiterhin waagerecht scrollen', async ({ page }) => {
    await wardrobe.addItem('Hose eins')
    await wardrobe.addItem('Hose zwei')

    // Die Bahn bringt ihren eigenen Scroller mit - der darf nicht mitgesperrt sein.
    const canScroll = await page.evaluate(() => {
      const scroller = document
        .querySelector('[data-testid="lane-inbox"]')
        ?.querySelector('[data-testid="lane-scroller"]')

      if (!scroller) throw new Error('Bahn-Scroller nicht gefunden')

      return getComputedStyle(scroller).overflowX
    })

    expect(canScroll).toBe('auto')
  })
})

test('legt die Startkategorien genau einmal an', async ({ page }) => {
  // Regression: React fuehrt Effekte im StrictMode ueberlappend doppelt aus.
  // Vorher entstanden dadurch vier Haushalte und jede Kategorie zweimal.
  await expect(wardrobe.filterChip('Hose')).toHaveCount(1)
  await expect(page.getByTestId('lane-top')).toHaveCount(1)
})

test('nimmt ein Foto auf und legt es in der mittleren Bahn ab', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

  await wardrobe.inbox.expectCount(1)
  await expect(wardrobe.inbox.card('Lieblingshose')).toBeVisible()
})

test('legt neue Stuecke standardmaessig in die Mitte, nicht in einen Haushalt', async () => {
  await wardrobe.addItem('Lieblingshose')

  // Die Entscheidung, wo etwas liegt, trifft bewusst das Kind.
  await wardrobe.inbox.expectCount(1)
  await wardrobe.top.expectCount(0)
  await wardrobe.bottom.expectCount(0)
})

test('uebernimmt einen gewaehlten Zielhaushalt direkt beim Anlegen', async () => {
  await wardrobe.addItem('Regenjacke', { category: 'Jacke', target: 'Haushalt 2' })

  await wardrobe.bottom.expectCount(1)
  await wardrobe.inbox.expectCount(0)
})

test('behaelt die Kleidung nach einem Neustart', async () => {
  await wardrobe.addItem('Lieblingshose')

  await wardrobe.reload()

  await expect(wardrobe.inbox.card('Lieblingshose')).toBeVisible()
})

test('legt eine neue Kategorie an und weist sie zu', async ({ page }) => {
  await page.getByTestId('add-button').click()
  await wardrobe.addSheet.choosePhoto(
    (await import('./pages/WardrobePage.ts')).PHOTO_FIXTURE,
  )
  await wardrobe.addSheet.titleInput.fill('Wintermütze')
  await wardrobe.addSheet.createCategory('Mütze')
  await wardrobe.addSheet.categoryChip('Mütze').click()
  await wardrobe.addSheet.save()

  await expect(wardrobe.filterChip('Mütze')).toBeVisible()
})

for (const pointerType of ['mouse', 'touch'] as const) {
  test(`verschiebt per Ziehen zwischen den Bahnen (${pointerType})`, async () => {
    await wardrobe.addItem('Lieblingshose')

    await wardrobe.dragCardToLane('Lieblingshose', wardrobe.top, pointerType)

    await wardrobe.top.expectCount(1)
    await wardrobe.inbox.expectCount(0)
  })
}

test('protokolliert Zugang und Wechsel mit Zeitpunkt', async () => {
  await wardrobe.addItem('Lieblingshose')
  await wardrobe.dragCardToLane('Lieblingshose', wardrobe.bottom)
  await wardrobe.bottom.expectCount(1)

  const detail = await wardrobe.openItem('Lieblingshose')

  // Erst auf die Anzahl warten: allTextContents() wartet von sich aus auf nichts
  // und laeuft sonst in eine Wettlaufsituation mit dem Nachladen des Verlaufs.
  await expect(detail.historyEntries()).toHaveCount(2)

  // Neueste Aenderung zuerst.
  expect(await detail.historyTexts()).toEqual(['Neu → Haushalt 2', 'Neu hinzugefügt'])
  await expect(detail.root.getByTestId('verlauf-zeit').first()).toContainText('2026')
})

test('wechselt den Haushalt auch ohne Geste ueber die Detailansicht', async () => {
  await wardrobe.addItem('Lieblingshose')

  const detail = await wardrobe.openItem('Lieblingshose')
  await detail.moveTo('Haushalt 1')
  await detail.close()

  await wardrobe.top.expectCount(1)
})

test('graut beim Filtern die anderen Kategorien aus, statt sie zu verstecken', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.addItem('Ringelshirt', { category: 'T-Shirt' })

  await wardrobe.filterBy('Hose')

  // Beide bleiben sichtbar - die raeumliche Anordnung soll stabil bleiben.
  await expect(wardrobe.card('Lieblingshose')).toBeVisible()
  await expect(wardrobe.card('Ringelshirt')).toBeVisible()

  await expect(wardrobe.card('Lieblingshose')).toHaveAttribute('data-dimmed', 'false')
  await expect(wardrobe.card('Ringelshirt')).toHaveAttribute('data-dimmed', 'true')
  // Ausgegraut heisst auch: nimmt keine Eingaben mehr an.
  await expect(wardrobe.card('Ringelshirt')).toBeDisabled()
})

test('setzt den Filter ueber "Alle" zurueck', async () => {
  await wardrobe.addItem('Ringelshirt', { category: 'T-Shirt' })
  await wardrobe.filterBy('Hose')
  await expect(wardrobe.card('Ringelshirt')).toHaveAttribute('data-dimmed', 'true')

  await wardrobe.allFilter.click()

  await expect(wardrobe.card('Ringelshirt')).toHaveAttribute('data-dimmed', 'false')
})

test('loescht ein Kleidungsstueck erst nach Bestaetigung', async () => {
  await wardrobe.addItem('Lieblingshose')

  const detail = await wardrobe.openItem('Lieblingshose')
  await detail.startDelete()
  await detail.keepAfterAll()
  await wardrobe.inbox.expectCount(1)

  await detail.startDelete()
  await detail.confirmDelete()

  await wardrobe.inbox.expectCount(0)
})
