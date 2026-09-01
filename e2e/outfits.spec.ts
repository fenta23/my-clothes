import { expect, test } from '@playwright/test'

import { WardrobePage } from './pages/WardrobePage.ts'

/*
 * Der Sinn der Outfits steht und faellt mit der Statuszeile: die App weiss als
 * einzige, wo jedes Teil gerade liegt. Genau das wird hier geprueft - nicht, ob eine
 * Kachel erscheint.
 */

let wardrobe: WardrobePage

test.beforeEach(async ({ page }) => {
  wardrobe = new WardrobePage(page)
  await wardrobe.open()
})

test('legt ein Outfit an und findet es nach einem Neustart wieder', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.addItem('Rotes Shirt', { category: 'T-Shirt' })

  const outfits = await wardrobe.showOutfits()
  await expect(outfits.emptyHint).toBeVisible()

  await outfits.create('Schultag', ['Lieblingshose', 'Rotes Shirt'])
  await expect(outfits.card('Schultag')).toBeVisible()
  await expect(outfits.cardPieces('Schultag')).toHaveCount(2)

  await wardrobe.reload()
  const nachNeustart = await wardrobe.showOutfits()

  await expect(nachNeustart.card('Schultag')).toBeVisible()
})

test('ordnet die Teile in Koerperreihenfolge, nicht in der der Auswahl', async () => {
  // Absichtlich von unten nach oben gewaehlt.
  await wardrobe.addItem('Sneaker', { category: 'Schuhe' })
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.addItem('Rotes Shirt', { category: 'T-Shirt' })

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Schultag', ['Sneaker', 'Lieblingshose', 'Rotes Shirt'])
  await outfits.open('Schultag')

  const zeilen = outfits.sheetRows()
  await expect(zeilen).toHaveCount(3)
  await expect(zeilen.nth(0)).toHaveAttribute('data-slot', 'oben')
  await expect(zeilen.nth(1)).toHaveAttribute('data-slot', 'unten')
  await expect(zeilen.nth(2)).toHaveAttribute('data-slot', 'fuesse')
})

test('meldet, wenn die Teile eines Outfits auf beide Haushalte verteilt sind', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose', target: 'Haushalt 1' })
  await wardrobe.addItem('Rotes Shirt', { category: 'T-Shirt', target: 'Haushalt 1' })

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Schultag', ['Lieblingshose', 'Rotes Shirt'])

  await expect(outfits.cardStatus('Schultag')).toHaveText('Komplett bei Haushalt 1')
  await expect(outfits.cardStatus('Schultag')).toHaveAttribute('data-verteilt', 'false')

  // Ein Teil zieht um - genau der Fall, um den es geht.
  await wardrobe.showWardrobe()
  await wardrobe.dragCardToLane('Rotes Shirt', wardrobe.bottom)
  await wardrobe.bottom.expectCount(1)

  await wardrobe.showOutfits()
  await expect(outfits.cardStatus('Schultag')).toHaveText(
    '1 bei Haushalt 1 · 1 bei Haushalt 2',
  )
  await expect(outfits.cardStatus('Schultag')).toHaveAttribute('data-verteilt', 'true')
})

test('nimmt ein geloeschtes Kleidungsstueck aus dem Outfit heraus', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.addItem('Rotes Shirt', { category: 'T-Shirt' })

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Schultag', ['Lieblingshose', 'Rotes Shirt'])
  await expect(outfits.cardPieces('Schultag')).toHaveCount(2)

  await wardrobe.showWardrobe()
  const detail = await wardrobe.openItem('Rotes Shirt')
  await detail.startDelete()
  await detail.confirmDelete()

  await wardrobe.showOutfits()
  // Das Outfit bleibt - nur der Verweis auf das geloeschte Stueck ist weg.
  await expect(outfits.card('Schultag')).toBeVisible()
  await expect(outfits.cardPieces('Schultag')).toHaveCount(1)
})

test('aendert die Teile eines vorhandenen Outfits', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.addItem('Rotes Shirt', { category: 'T-Shirt' })

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Schultag', ['Lieblingshose'])

  await outfits.open('Schultag')
  await outfits.edit()
  await outfits.pick('Rotes Shirt')
  await outfits.save()

  await expect(outfits.cardPieces('Schultag')).toHaveCount(2)
})

test('loescht ein Outfit, ohne die Kleidung mitzunehmen', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Schultag', ['Lieblingshose'])
  await outfits.open('Schultag')
  await outfits.delete()

  await expect(outfits.emptyHint).toBeVisible()

  await wardrobe.showWardrobe()
  await expect(wardrobe.card('Lieblingshose')).toBeVisible()
})

test('bleibt beim Umschalten unbeweglich', async ({ page }) => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Schultag', ['Lieblingshose'])

  // Die Scroll-Sperre gilt auf beiden Bildschirmen, nicht nur auf dem ersten.
  expect(await wardrobe.documentOverflow()).toBeLessThanOrEqual(0)

  const kopfzeile = page.getByTestId('kopfzeile')
  await expect(kopfzeile).toBeVisible()

  await wardrobe.showWardrobe()
  expect(await wardrobe.documentOverflow()).toBeLessThanOrEqual(0)
})

test('folgt dem Trageort, den man in den Einstellungen gewaehlt hat', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

  // Wer eine Hose zur Kopfbedeckung erklaert, hat seine Gruende - die Angabe gewinnt.
  const settings = await wardrobe.openSettings()
  await settings.setCategorySlot('Hose', 'kopf')
  await settings.close()

  const outfits = await wardrobe.showOutfits()
  await outfits.create('Verkleidung', ['Lieblingshose'])
  await outfits.open('Verkleidung')

  await expect(outfits.sheetRows().nth(0)).toHaveAttribute('data-slot', 'kopf')
})
