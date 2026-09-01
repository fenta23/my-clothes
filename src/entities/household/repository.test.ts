// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'

import type { Db } from '../db.ts'
import { seedIfEmpty } from '../seed.ts'
import { freshDb } from '../testDb.ts'
import { laneName, listHouseholds, renameHousehold } from './repository.ts'

let db: Db

beforeEach(async () => {
  db = await freshDb('household')
  await seedIfEmpty(db, 1000)
})

describe('renameHousehold', () => {
  it('aendert den Namen und das Aenderungsdatum', async () => {
    const [erster] = await listHouseholds(db)

    const updated = await renameHousehold(db, erster!.id, '  Bei Mama  ', 5000)

    expect(updated?.name).toBe('Bei Mama')
    expect(updated?.updatedAt).toBe(5000)
    expect(updated?.createdAt).toBe(1000)
  })

  it('behaelt die Reihenfolge der Bahnen bei', async () => {
    const [erster] = await listHouseholds(db)
    await renameHousehold(db, erster!.id, 'Bei Mama', 5000)

    expect((await listHouseholds(db)).map((h) => h.position)).toEqual([0, 1])
  })

  it('liefert null fuer einen unbekannten Haushalt', async () => {
    expect(await renameHousehold(db, 'gibtsnicht', 'X')).toBeNull()
  })
})

describe('laneName', () => {
  it('nennt die mittlere Bahn "Neu"', async () => {
    expect(await laneName(db, null)).toBe('Neu')
  })

  it('liefert den Namen eines Haushalts', async () => {
    const [erster] = await listHouseholds(db)

    expect(await laneName(db, erster!.id)).toBe('Haushalt 1')
  })

  it('faellt bei unbekannter ID auf die mittlere Bahn zurueck', async () => {
    // Lieber eine harmlose Beschriftung als ein Absturz im Verlauf.
    expect(await laneName(db, 'gibtsnicht')).toBe('Neu')
  })
})
