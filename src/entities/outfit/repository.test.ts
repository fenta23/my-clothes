// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'

import type { Db } from '../db.ts'
import { freshDb } from '../testDb.ts'
import {
  createOutfit,
  deleteOutfit,
  listOutfits,
  renameOutfit,
  setOutfitItems,
} from './repository.ts'

let db: Db

beforeEach(async () => {
  db = await freshDb('outfit')
})

describe('createOutfit', () => {
  it('legt ein Outfit mit seinen Teilen an', async () => {
    const outfit = await createOutfit(db, { name: '  Schultag  ', itemIds: ['a', 'b'] }, 1000)

    expect(outfit.name).toBe('Schultag')
    expect(outfit.itemIds).toEqual(['a', 'b'])
    expect(outfit.createdAt).toBe(1000)
    expect(outfit.updatedAt).toBe(1000)
  })

  it('haelt die uebergebene Liste nicht fest', async () => {
    // Sonst aendert sich ein gespeichertes Outfit, wenn der Aufrufer weiterarbeitet.
    const ids = ['a']
    await createOutfit(db, { name: 'Schultag', itemIds: ids }, 1000)
    ids.push('b')

    const [gespeichert] = await listOutfits(db)
    expect(gespeichert?.itemIds).toEqual(['a'])
  })
})

describe('listOutfits', () => {
  it('gibt das neueste zuerst zurueck', async () => {
    await createOutfit(db, { name: 'Alt', itemIds: [] }, 1000)
    await createOutfit(db, { name: 'Neu', itemIds: [] }, 2000)

    expect((await listOutfits(db)).map((o) => o.name)).toEqual(['Neu', 'Alt'])
  })
})

describe('renameOutfit', () => {
  it('aendert den Namen und das Aenderungsdatum', async () => {
    const outfit = await createOutfit(db, { name: 'Schultag', itemIds: [] }, 1000)

    const updated = await renameOutfit(db, outfit.id, '  Kindergeburtstag  ', 5000)

    expect(updated?.name).toBe('Kindergeburtstag')
    expect(updated?.updatedAt).toBe(5000)
    expect(updated?.createdAt).toBe(1000)
  })

  it('liefert null fuer ein unbekanntes Outfit', async () => {
    expect(await renameOutfit(db, 'gibtsnicht', 'X')).toBeNull()
  })
})

describe('setOutfitItems', () => {
  it('ersetzt die Teile vollstaendig', async () => {
    const outfit = await createOutfit(db, { name: 'Schultag', itemIds: ['a', 'b'] }, 1000)

    const updated = await setOutfitItems(db, outfit.id, ['c'], 5000)

    expect(updated?.itemIds).toEqual(['c'])
    expect(updated?.updatedAt).toBe(5000)
  })

  it('liefert null fuer ein unbekanntes Outfit', async () => {
    expect(await setOutfitItems(db, 'gibtsnicht', [])).toBeNull()
  })
})

describe('deleteOutfit', () => {
  it('entfernt nur das gewaehlte Outfit', async () => {
    const eins = await createOutfit(db, { name: 'Eins', itemIds: [] }, 1000)
    await createOutfit(db, { name: 'Zwei', itemIds: [] }, 2000)

    await deleteOutfit(db, eins.id)

    expect((await listOutfits(db)).map((o) => o.name)).toEqual(['Zwei'])
  })
})
