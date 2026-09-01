// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { DB_VERSION, openClothesDB } from './db.ts'
import { newCategory } from './category/repository.ts'
import { newHousehold } from './household/repository.ts'
import { openAtVersion } from './testDb.ts'

/*
 * Der Test, der beim Bau der Outfits gefehlt hat.
 *
 * Die vorige Upgrade-Funktion kehrte bei `oldVersion >= 1` zurueck, bevor sie den
 * Rest erreichte. Wer auf Version 2 stand, haette beim Sprung auf 3 den neuen Store
 * nie bekommen - die App waere mit NotFoundError stehen geblieben. Aufgefallen waere
 * das erst auf dem Geraet, denn ein frisch angelegter Teststand nimmt den anderen Weg.
 */
let counter = 0

function nextName(): string {
  counter += 1

  return `migration-${counter}`
}

describe('Datenbank-Migration', () => {
  it('legt beim Sprung von Version 2 den Store fuer Outfits an', async () => {
    const name = nextName()

    const alt = await openAtVersion(name, 2)
    expect([...alt.objectStoreNames]).not.toContain('outfits')
    alt.close()

    const db = await openClothesDB(name)

    expect([...db.objectStoreNames]).toContain('outfits')
    db.close()
  })

  it('laesst Haushalte und Kategorien beim Sprung unangetastet', async () => {
    const name = nextName()

    const alt = await openAtVersion(name, 2)
    const tx = alt.transaction(['households', 'categories'], 'readwrite')
    await Promise.all([
      tx.objectStore('households').add(newHousehold('Bei Mama', 0, 1000)),
      tx.objectStore('categories').add(
        newCategory({ name: 'Hose', emoji: '👖', colorHex: '#4F7CFF', sortOrder: 0 }, 1000),
      ),
      tx.done,
    ])
    alt.close()

    const db = await openClothesDB(name)

    expect((await db.getAll('households')).map((h) => h.name)).toEqual(['Bei Mama'])
    expect((await db.getAll('categories')).map((c) => c.name)).toEqual(['Hose'])
    db.close()
  })

  it('kommt von Version 1 auf denselben Stand wie eine frische Datenbank', async () => {
    const alteStand = nextName()
    const frisch = nextName()

    const alt = await openAtVersion(alteStand, 1)
    alt.close()

    const migriert = await openClothesDB(alteStand)
    const neu = await openClothesDB(frisch)

    // Derselbe Bestand an Stores, egal von wo aus gestartet wurde.
    expect([...migriert.objectStoreNames].sort()).toEqual([...neu.objectStoreNames].sort())
    expect(migriert.version).toBe(DB_VERSION)

    migriert.close()
    neu.close()
  })
})
