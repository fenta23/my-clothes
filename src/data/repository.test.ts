/*
 * Node-Umgebung statt jsdom: fake-indexeddb serialisiert jsdom-Blobs still zu einem
 * leeren Objekt, wodurch jede Bildpruefung wertlos waere. Mit Nodes nativem Blob
 * ueberlebt der Inhalt die Rundreise durch IndexedDB unveraendert. Der Data-Layer
 * braucht ohnehin kein DOM.
 */
// @vitest-environment node

import type { IDBPDatabase } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openClothesDB, type ClothesDB } from './db.ts'
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getImages,
  listCategories,
  listEvents,
  listHouseholds,
  listItems,
  moveItem,
  renameHousehold,
  renameItem,
  seedIfEmpty,
  setItemCategory,
  updateCategory,
} from './repository.ts'

let db: IDBPDatabase<ClothesDB>
let dbCounter = 0

/** Jeder Test bekommt eine frische Datenbank, damit nichts durchsickert. */
beforeEach(async () => {
  dbCounter += 1
  db = await openClothesDB(`test-db-${dbCounter}`)
})

const blob = (text: string) => new Blob([text], { type: 'image/jpeg' })

async function seedAndGetHouseholds() {
  await seedIfEmpty(db, 1000)
  const [a, b] = await listHouseholds(db)
  if (!a || !b) throw new Error('Seed hat keine zwei Haushalte angelegt')

  return { a, b }
}

async function addItem(householdId: string | null, title = 'Jeans') {
  return createItem(
    db,
    { title, categoryId: null, householdId, full: blob('full'), thumb: blob('thumb') },
    2000,
  )
}

describe('seedIfEmpty', () => {
  it('legt zwei Haushalte in fester Reihenfolge an', async () => {
    await seedIfEmpty(db, 1000)

    const households = await listHouseholds(db)

    expect(households).toHaveLength(2)
    expect(households.map((h) => h.position)).toEqual([0, 1])
    expect(households.map((h) => h.name)).toEqual(['Haushalt 1', 'Haushalt 2'])
  })

  it('legt die Startkategorien mit fortlaufender Sortierung an', async () => {
    await seedIfEmpty(db, 1000)

    const categories = await listCategories(db)

    expect(categories.length).toBeGreaterThan(0)
    expect(categories.map((c) => c.sortOrder)).toEqual(categories.map((_, i) => i))
    expect(categories.map((c) => c.name)).toContain('Hose')
  })

  it('verdoppelt nichts beim zweiten Aufruf', async () => {
    await seedIfEmpty(db, 1000)
    const before = await listCategories(db)

    // React fuehrt Effekte im StrictMode doppelt aus - das muss folgenlos bleiben.
    await seedIfEmpty(db, 2000)

    expect(await listHouseholds(db)).toHaveLength(2)
    expect(await listCategories(db)).toHaveLength(before.length)
  })
})

describe('createItem', () => {
  it('legt Kleidungsstueck und Bilder gemeinsam an', async () => {
    const item = await addItem(null)

    expect(await listItems(db)).toHaveLength(1)

    const images = await getImages(db, item.id)
    expect(images?.full).toBeInstanceOf(Blob)
    expect(images?.thumb).toBeInstanceOf(Blob)
  })

  it('gibt die Bilddaten unveraendert zurueck', async () => {
    const item = await addItem(null)

    const images = await getImages(db, item.id)

    // Inhalt und MIME-Typ muessen die Rundreise durch IndexedDB ueberstehen -
    // sonst laedt die App spaeter kaputte Fotos.
    expect(await images?.full.text()).toBe('full')
    expect(await images?.thumb.text()).toBe('thumb')
    expect(images?.full.type).toBe('image/jpeg')
  })

  it('protokolliert den Zugang mit der Zielbahn', async () => {
    const { a } = await seedAndGetHouseholds()
    const item = await addItem(a.id)

    const events = await listEvents(db, item.id)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'created', fromName: null, toName: 'Haushalt 1' })
  })

  it('nennt die mittlere Bahn in der Historie "Neu"', async () => {
    const item = await addItem(null)

    expect((await listEvents(db, item.id))[0]?.toName).toBe('Neu')
  })

  it('schneidet Leerzeichen im Titel ab', async () => {
    const item = await addItem(null, '  Lieblingshose  ')

    expect(item.title).toBe('Lieblingshose')
  })
})

describe('moveItem', () => {
  it('setzt die Zielbahn', async () => {
    const { a } = await seedAndGetHouseholds()
    const item = await addItem(null)

    const moved = await moveItem(db, item.id, a.id, 3000)

    expect(moved?.householdId).toBe(a.id)
    expect(moved?.updatedAt).toBe(3000)
  })

  it('protokolliert Herkunft und Ziel mit Namen', async () => {
    const { a, b } = await seedAndGetHouseholds()
    const item = await addItem(a.id)

    await moveItem(db, item.id, b.id, 3000)

    const events = await listEvents(db, item.id)
    expect(events[0]).toMatchObject({
      kind: 'moved',
      fromName: 'Haushalt 1',
      toName: 'Haushalt 2',
      timestamp: 3000,
    })
  })

  it('protokolliert auch den Weg zurueck in die mittlere Bahn', async () => {
    const { a } = await seedAndGetHouseholds()
    const item = await addItem(a.id)

    await moveItem(db, item.id, null, 3000)

    expect((await listEvents(db, item.id))[0]).toMatchObject({
      fromName: 'Haushalt 1',
      toName: 'Neu',
    })
  })

  it('erzeugt kein Ereignis beim Ablegen in der eigenen Bahn', async () => {
    const { a } = await seedAndGetHouseholds()
    const item = await addItem(a.id)

    await moveItem(db, item.id, a.id, 3000)

    // Nur das urspruengliche created-Ereignis.
    expect(await listEvents(db, item.id)).toHaveLength(1)
  })

  it('liefert null fuer ein unbekanntes Kleidungsstueck', async () => {
    expect(await moveItem(db, 'gibtsnicht', null)).toBeNull()
  })

  it('behaelt in der Historie den alten Haushaltsnamen nach einer Umbenennung', async () => {
    const { a, b } = await seedAndGetHouseholds()
    const item = await addItem(a.id)
    await moveItem(db, item.id, b.id, 3000)

    await renameHousehold(db, a.id, 'Bei Mama', 4000)

    // Die Historie erzaehlt, wie es damals hiess - nicht, wie es heute heisst.
    expect((await listEvents(db, item.id))[0]?.fromName).toBe('Haushalt 1')
  })

  it('sortiert die Historie mit dem neuesten Eintrag zuerst', async () => {
    const { a, b } = await seedAndGetHouseholds()
    const item = await addItem(null)

    await moveItem(db, item.id, a.id, 3000)
    await moveItem(db, item.id, b.id, 4000)

    expect((await listEvents(db, item.id)).map((e) => e.timestamp)).toEqual([
      4000, 3000, 2000,
    ])
  })
})

describe('setItemCategory', () => {
  it('protokolliert den Kategoriewechsel mit beiden Namen', async () => {
    const hose = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' })
    const rock = await createCategory(db, { name: 'Rock', emoji: '🩱', colorHex: '#111' })
    const item = await addItem(null)

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
    const item = await addItem(null)
    await setItemCategory(db, item.id, hose.id, 3000)

    await setItemCategory(db, item.id, hose.id, 4000)

    expect(await listEvents(db, item.id)).toHaveLength(2)
  })
})

describe('deleteItem', () => {
  it('entfernt Kleidungsstueck, Bilder und Historie', async () => {
    const item = await addItem(null)
    await moveItem(db, item.id, null, 3000)

    await deleteItem(db, item.id)

    expect(await listItems(db)).toHaveLength(0)
    expect(await getImages(db, item.id)).toBeUndefined()
    expect(await listEvents(db, item.id)).toHaveLength(0)
  })

  it('laesst andere Kleidungsstuecke unberuehrt', async () => {
    const keep = await addItem(null, 'Bleibt')
    const drop = await addItem(null, 'Geht')

    await deleteItem(db, drop.id)

    expect((await listItems(db)).map((i) => i.id)).toEqual([keep.id])
  })
})

describe('deleteCategory', () => {
  it('macht betroffene Kleidungsstuecke unkategorisiert, statt sie zu loeschen', async () => {
    const hose = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' })
    const item = await addItem(null)
    await setItemCategory(db, item.id, hose.id, 3000)

    const affected = await deleteCategory(db, hose.id, 4000)

    expect(affected).toBe(1)
    expect(await listItems(db)).toHaveLength(1)
    expect((await listItems(db))[0]?.categoryId).toBeNull()
  })

  it('meldet null Betroffene bei einer ungenutzten Kategorie', async () => {
    const leer = await createCategory(db, { name: 'Leer', emoji: '❓', colorHex: '#000' })

    expect(await deleteCategory(db, leer.id)).toBe(0)
    expect(await listCategories(db)).toHaveLength(0)
  })
})

describe('createCategory / updateCategory', () => {
  it('haengt neue Kategorien hinten an die Sortierung an', async () => {
    await seedIfEmpty(db, 1000)
    const before = await listCategories(db)

    const neu = await createCategory(db, { name: 'Mütze', emoji: '🧢', colorHex: '#000' })

    expect(neu.sortOrder).toBe(before.length)
  })

  it('schreibt das Aenderungsdatum fort', async () => {
    const c = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' }, 1000)

    const updated = await updateCategory(db, c.id, { name: '  Jeans  ' }, 5000)

    expect(updated?.name).toBe('Jeans')
    expect(updated?.updatedAt).toBe(5000)
    expect(updated?.createdAt).toBe(1000)
  })

  it('liefert null fuer eine unbekannte Kategorie', async () => {
    expect(await updateCategory(db, 'gibtsnicht', { name: 'X' })).toBeNull()
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

describe('listItems', () => {
  it('sortiert das zuletzt angelegte Stueck nach vorne', async () => {
    const alt = await createItem(
      db,
      { title: 'Alt', categoryId: null, householdId: null, full: blob('a'), thumb: blob('a') },
      1000,
    )
    const neu = await createItem(
      db,
      { title: 'Neu', categoryId: null, householdId: null, full: blob('b'), thumb: blob('b') },
      2000,
    )

    expect((await listItems(db)).map((i) => i.id)).toEqual([neu.id, alt.id])
  })
})
