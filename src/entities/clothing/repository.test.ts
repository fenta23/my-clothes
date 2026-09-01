// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'

import { createCategory } from '../category/repository.ts'
import type { Db } from '../db.ts'
import { listEvents } from '../event/repository.ts'
import { listHouseholds, renameHousehold } from '../household/repository.ts'
import { createOutfit, listOutfits } from '../outfit/repository.ts'
import { seedIfEmpty } from '../seed.ts'
import { freshDb, testBlob } from '../testDb.ts'
import {
  countItemsPerCategory,
  createItem,
  deleteItem,
  getImages,
  listItems,
  moveItem,
  renameItem,
  setItemCategory,
} from './repository.ts'

let db: Db

beforeEach(async () => {
  db = await freshDb('clothing')
})

async function households() {
  await seedIfEmpty(db, 1000)
  const [a, b] = await listHouseholds(db)
  if (!a || !b) throw new Error('Seed hat keine zwei Haushalte angelegt')

  return { a, b }
}

async function addItem(householdId: string | null = null, title = 'Jeans') {
  return createItem(
    db,
    {
      title,
      categoryId: null,
      householdId,
      full: testBlob(`full-${title}`),
      thumb: testBlob(`thumb-${title}`),
    },
    2000,
  )
}

describe('createItem', () => {
  it('legt Kleidungsstueck und Bilder gemeinsam an', async () => {
    const item = await addItem()

    expect(await listItems(db)).toHaveLength(1)

    const images = await getImages(db, item.id)
    expect(images?.full).toBeInstanceOf(Blob)
    expect(images?.thumb).toBeInstanceOf(Blob)
  })

  it('gibt die Bilddaten unveraendert zurueck', async () => {
    const item = await addItem()

    const images = await getImages(db, item.id)

    // Inhalt und MIME-Typ muessen die Rundreise durch IndexedDB ueberstehen -
    // sonst laedt die App spaeter kaputte Fotos.
    expect(await images?.full.text()).toBe('full-Jeans')
    expect(await images?.thumb.text()).toBe('thumb-Jeans')
    expect(images?.full.type).toBe('image/jpeg')
  })

  it('protokolliert den Zugang mit der Zielbahn', async () => {
    const { a } = await households()
    const item = await addItem(a.id)

    const events = await listEvents(db, item.id)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'created', fromName: null, toName: 'Haushalt 1' })
  })

  it('nennt die mittlere Bahn in der Historie "Neu"', async () => {
    const item = await addItem()

    expect((await listEvents(db, item.id))[0]?.toName).toBe('Neu')
  })

  it('schneidet Leerzeichen im Titel ab', async () => {
    const item = await addItem(null, '  Lieblingshose  ')

    expect(item.title).toBe('Lieblingshose')
  })
})

describe('moveItem', () => {
  it('setzt die Zielbahn', async () => {
    const { a } = await households()
    const item = await addItem()

    const moved = await moveItem(db, item.id, a.id, 3000)

    expect(moved?.householdId).toBe(a.id)
    expect(moved?.updatedAt).toBe(3000)
  })

  it('protokolliert Herkunft und Ziel mit Namen', async () => {
    const { a, b } = await households()
    const item = await addItem(a.id)

    await moveItem(db, item.id, b.id, 3000)

    expect((await listEvents(db, item.id))[0]).toMatchObject({
      kind: 'moved',
      fromName: 'Haushalt 1',
      toName: 'Haushalt 2',
      timestamp: 3000,
    })
  })

  it('protokolliert auch den Weg zurueck in die mittlere Bahn', async () => {
    const { a } = await households()
    const item = await addItem(a.id)

    await moveItem(db, item.id, null, 3000)

    expect((await listEvents(db, item.id))[0]).toMatchObject({
      fromName: 'Haushalt 1',
      toName: 'Neu',
    })
  })

  it('erzeugt kein Ereignis beim Ablegen in der eigenen Bahn', async () => {
    const { a } = await households()
    const item = await addItem(a.id)

    await moveItem(db, item.id, a.id, 3000)

    // Nur das urspruengliche created-Ereignis.
    expect(await listEvents(db, item.id)).toHaveLength(1)
  })

  it('liefert null fuer ein unbekanntes Kleidungsstueck', async () => {
    expect(await moveItem(db, 'gibtsnicht', null)).toBeNull()
  })

  it('behaelt in der Historie den alten Haushaltsnamen nach einer Umbenennung', async () => {
    const { a, b } = await households()
    const item = await addItem(a.id)
    await moveItem(db, item.id, b.id, 3000)

    await renameHousehold(db, a.id, 'Bei Mama', 4000)

    // Die Historie erzaehlt, wie es damals hiess - nicht, wie es heute heisst.
    expect((await listEvents(db, item.id))[0]?.fromName).toBe('Haushalt 1')
  })

  it('sortiert die Historie mit dem neuesten Eintrag zuerst', async () => {
    const { a, b } = await households()
    const item = await addItem()

    await moveItem(db, item.id, a.id, 3000)
    await moveItem(db, item.id, b.id, 4000)

    expect((await listEvents(db, item.id)).map((e) => e.timestamp)).toEqual([4000, 3000, 2000])
  })
})

describe('setItemCategory', () => {
  it('protokolliert den Kategoriewechsel mit beiden Namen', async () => {
    const hose = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' })
    const rock = await createCategory(db, { name: 'Rock', emoji: '🩱', colorHex: '#111' })
    const item = await addItem()

    await setItemCategory(db, item.id, hose.id, 3000)
    await setItemCategory(db, item.id, rock.id, 4000)

    expect((await listEvents(db, item.id))[0]).toMatchObject({
      kind: 'categoryChanged',
      fromName: 'Hose',
      toName: 'Rock',
    })
  })

  it('erzeugt kein Ereignis, wenn die Kategorie gleich bleibt', async () => {
    const hose = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' })
    const item = await addItem()
    await setItemCategory(db, item.id, hose.id, 3000)

    await setItemCategory(db, item.id, hose.id, 4000)

    expect(await listEvents(db, item.id)).toHaveLength(2)
  })
})

describe('renameItem', () => {
  it('aendert den Titel und das Aenderungsdatum', async () => {
    const item = await addItem(null, 'Alt')

    const updated = await renameItem(db, item.id, '  Neu  ', 9000)

    expect(updated?.title).toBe('Neu')
    expect(updated?.updatedAt).toBe(9000)
  })
})

describe('deleteItem', () => {
  it('entfernt Kleidungsstueck, Bilder und Historie', async () => {
    const item = await addItem()
    await moveItem(db, item.id, null, 3000)

    await deleteItem(db, item.id)

    expect(await listItems(db)).toHaveLength(0)
    expect(await getImages(db, item.id)).toBeUndefined()
    expect(await listEvents(db, item.id)).toHaveLength(0)
  })

  it('nimmt das Stueck auch aus jedem Outfit heraus', async () => {
    const jeans = await addItem(null, 'Jeans')
    const shirt = await addItem(null, 'Shirt')
    await createOutfit(db, { name: 'Schultag', itemIds: [jeans.id, shirt.id] }, 1000)
    await createOutfit(db, { name: 'Ohne Jeans', itemIds: [shirt.id] }, 1000)

    await deleteItem(db, jeans.id, 7000)

    const outfits = await listOutfits(db)
    // Kein Outfit darf auf ein Stueck zeigen, das es nicht mehr gibt.
    expect(outfits.flatMap((o) => o.itemIds)).not.toContain(jeans.id)
    expect(outfits.find((o) => o.name === 'Schultag')?.itemIds).toEqual([shirt.id])
    expect(outfits.find((o) => o.name === 'Schultag')?.updatedAt).toBe(7000)
    // Unbeteiligte Outfits bleiben unangetastet.
    expect(outfits.find((o) => o.name === 'Ohne Jeans')?.updatedAt).toBe(1000)
  })

  it('laesst andere Kleidungsstuecke unberuehrt', async () => {
    const keep = await addItem(null, 'Bleibt')
    const drop = await addItem(null, 'Geht')

    await deleteItem(db, drop.id)

    expect((await listItems(db)).map((i) => i.id)).toEqual([keep.id])
  })
})

describe('listItems', () => {
  it('sortiert das zuletzt angelegte Stueck nach vorne', async () => {
    const alt = await createItem(
      db,
      {
        title: 'Alt',
        categoryId: null,
        householdId: null,
        full: testBlob('a'),
        thumb: testBlob('a'),
      },
      1000,
    )
    const neu = await createItem(
      db,
      {
        title: 'Neu',
        categoryId: null,
        householdId: null,
        full: testBlob('b'),
        thumb: testBlob('b'),
      },
      2000,
    )

    expect((await listItems(db)).map((i) => i.id)).toEqual([neu.id, alt.id])
  })
})

describe('countItemsPerCategory', () => {
  it('zaehlt je Kategorie', async () => {
    const hose = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' })
    const rock = await createCategory(db, { name: 'Rock', emoji: '🩱', colorHex: '#111' })

    const a = await addItem(null, 'A')
    const b = await addItem(null, 'B')
    await addItem(null, 'C')

    await setItemCategory(db, a.id, hose.id, 3000)
    await setItemCategory(db, b.id, hose.id, 3000)

    const counts = await countItemsPerCategory(db)
    expect(counts.get(hose.id)).toBe(2)
    // Unbenutzte Kategorien tauchen gar nicht auf, statt mit 0 gefuehrt zu werden.
    expect(counts.has(rock.id)).toBe(false)
  })

  it('ignoriert unkategorisierte Stuecke', async () => {
    await addItem(null, 'Ohne')

    expect((await countItemsPerCategory(db)).size).toBe(0)
  })
})
