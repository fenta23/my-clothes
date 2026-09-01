// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES } from './category/defaults.ts'
import { listCategories } from './category/repository.ts'
import type { Db } from './db.ts'
import { listHouseholds } from './household/repository.ts'
import { seedIfEmpty } from './seed.ts'
import { freshDb } from './testDb.ts'

let db: Db

beforeEach(async () => {
  db = await freshDb('seed')
})

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

    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(categories.map((c) => c.sortOrder)).toEqual(categories.map((_, i) => i))
    expect(categories.map((c) => c.name)).toContain('Hose')
  })

  it('verdoppelt nichts bei zwei GLEICHZEITIGEN Aufrufen', async () => {
    // Genau dieser Fall trat auf: React fuehrt Effekte im StrictMode ueberlappend
    // doppelt aus, beide Laeufe sahen eine leere Datenbank und legten an.
    await Promise.all([seedIfEmpty(db, 1000), seedIfEmpty(db, 1000)])

    expect(await listHouseholds(db)).toHaveLength(2)
    expect(await listCategories(db)).toHaveLength(DEFAULT_CATEGORIES.length)
  })

  it('verdoppelt nichts beim zweiten Aufruf', async () => {
    await seedIfEmpty(db, 1000)
    await seedIfEmpty(db, 2000)

    expect(await listHouseholds(db)).toHaveLength(2)
    expect(await listCategories(db)).toHaveLength(DEFAULT_CATEGORIES.length)
  })
})
