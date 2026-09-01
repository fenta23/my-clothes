// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'

import { createItem, listItems, setItemCategory } from '../clothing/repository.ts'
import type { Db } from '../db.ts'
import { seedIfEmpty } from '../seed.ts'
import { freshDb, testBlob } from '../testDb.ts'
import { DEFAULT_CATEGORIES } from './defaults.ts'
import {
  createCategory,
  deleteCategory,
  listCategories,
  moveCategory,
  updateCategory,
} from './repository.ts'

let db: Db

beforeEach(async () => {
  db = await freshDb('category')
})

async function addItem(title = 'Jeans') {
  return createItem(
    db,
    {
      title,
      categoryId: null,
      householdId: null,
      full: testBlob('full'),
      thumb: testBlob('thumb'),
    },
    2000,
  )
}

describe('createCategory', () => {
  it('haengt neue Kategorien hinten an die Sortierung an', async () => {
    await seedIfEmpty(db, 1000)

    const neu = await createCategory(db, { name: 'Mütze', emoji: '🧢', colorHex: '#000' })

    expect(neu.sortOrder).toBe(DEFAULT_CATEGORIES.length)
  })

  it('schneidet Leerzeichen im Namen ab', async () => {
    const neu = await createCategory(db, { name: '  Mütze  ', emoji: '🧢', colorHex: '#000' })

    expect(neu.name).toBe('Mütze')
  })
})

describe('updateCategory', () => {
  it('schreibt das Aenderungsdatum fort', async () => {
    const c = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' }, 1000)

    const updated = await updateCategory(db, c.id, { name: '  Jeans  ' }, 5000)

    expect(updated?.name).toBe('Jeans')
    expect(updated?.updatedAt).toBe(5000)
    expect(updated?.createdAt).toBe(1000)
  })

  it('laesst nicht genannte Felder unangetastet', async () => {
    const c = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#123456' })

    const updated = await updateCategory(db, c.id, { emoji: '👗' })

    expect(updated?.name).toBe('Hose')
    expect(updated?.colorHex).toBe('#123456')
  })

  it('liefert null fuer eine unbekannte Kategorie', async () => {
    expect(await updateCategory(db, 'gibtsnicht', { name: 'X' })).toBeNull()
  })
})

describe('deleteCategory', () => {
  it('macht betroffene Kleidungsstuecke unkategorisiert, statt sie zu loeschen', async () => {
    const hose = await createCategory(db, { name: 'Hose', emoji: '👖', colorHex: '#000' })
    const item = await addItem()
    await setItemCategory(db, item.id, hose.id, 3000)

    const affected = await deleteCategory(db, hose.id, 4000)

    expect(affected).toBe(1)
    // Kleidung verschwindet nie, weil eine Schublade wegfaellt.
    expect(await listItems(db)).toHaveLength(1)
    expect((await listItems(db))[0]?.categoryId).toBeNull()
  })

  it('meldet null Betroffene bei einer ungenutzten Kategorie', async () => {
    const leer = await createCategory(db, { name: 'Leer', emoji: '❓', colorHex: '#000' })

    expect(await deleteCategory(db, leer.id)).toBe(0)
    expect(await listCategories(db)).toHaveLength(0)
  })
})

describe('moveCategory', () => {
  beforeEach(async () => {
    await seedIfEmpty(db, 1000)
  })

  it('tauscht eine Kategorie mit ihrem Vorgaenger', async () => {
    const before = await listCategories(db)

    expect(await moveCategory(db, before[1]!.id, 'up', 5000)).toBe(true)

    const after = await listCategories(db)
    expect(after[0]?.id).toBe(before[1]?.id)
    expect(after[1]?.id).toBe(before[0]?.id)
  })

  it('tauscht eine Kategorie mit ihrem Nachfolger', async () => {
    const erste = (await listCategories(db))[0]!

    await moveCategory(db, erste.id, 'down', 5000)

    expect((await listCategories(db))[1]?.id).toBe(erste.id)
  })

  it('tut am oberen Rand nichts', async () => {
    const before = await listCategories(db)

    expect(await moveCategory(db, before[0]!.id, 'up')).toBe(false)
    expect((await listCategories(db)).map((c) => c.id)).toEqual(before.map((c) => c.id))
  })

  it('tut am unteren Rand nichts', async () => {
    const before = await listCategories(db)

    expect(await moveCategory(db, before.at(-1)!.id, 'down')).toBe(false)
    expect((await listCategories(db)).map((c) => c.id)).toEqual(before.map((c) => c.id))
  })

  it('meldet false fuer eine unbekannte Kategorie', async () => {
    expect(await moveCategory(db, 'gibtsnicht', 'up')).toBe(false)
  })

  it('behaelt eine lueckenlose Sortierung bei', async () => {
    const zweite = (await listCategories(db))[1]!

    await moveCategory(db, zweite.id, 'up', 5000)

    const orders = (await listCategories(db)).map((c) => c.sortOrder)
    expect(orders).toEqual(orders.map((_, i) => i))
  })
})
