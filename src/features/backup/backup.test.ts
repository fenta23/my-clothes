// @vitest-environment node

import { zipSync } from 'fflate'
import type { IDBPDatabase } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  BACKUP_FORMAT,
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  readBackup,
} from './backup.ts'
import { listCategories, updateCategory } from '../../entities/category/repository.ts'
import { slotFor } from '../../entities/category/slots.ts'
import {
  createItem,
  getImages,
  listItems,
  moveItem,
} from '../../entities/clothing/repository.ts'
import { openClothesDB, type ClothesDB } from '../../entities/db.ts'
import { listEvents } from '../../entities/event/repository.ts'
import { createOutfit, listOutfits } from '../../entities/outfit/repository.ts'
import { listHouseholds, renameHousehold } from '../../entities/household/repository.ts'
import { seedIfEmpty } from '../../entities/seed.ts'

let db: IDBPDatabase<ClothesDB>
let counter = 0

beforeEach(async () => {
  counter += 1
  db = await openClothesDB(`backup-test-${counter}`)
})

async function freshDb() {
  counter += 1

  return openClothesDB(`backup-test-${counter}`)
}

const blob = (text: string) => new Blob([text], { type: 'image/jpeg' })

async function addItem(title: string, householdId: string | null = null) {
  return createItem(
    db,
    { title, categoryId: null, householdId, full: blob(`full-${title}`), thumb: blob(`thumb-${title}`) },
    2000,
  )
}

async function archiveOf(source: IDBPDatabase<ClothesDB>): Promise<Uint8Array> {
  const zip = await exportBackup(source, 5000)

  return new Uint8Array(await zip.arrayBuffer())
}

describe('exportBackup', () => {
  it('liefert ein ZIP', async () => {
    await seedIfEmpty(db, 1000)

    const zip = await exportBackup(db, 5000)

    expect(zip.type).toBe('application/zip')
    expect(zip.size).toBeGreaterThan(0)
  })

  it('enthaelt alle Datensaetze', async () => {
    await seedIfEmpty(db, 1000)
    await addItem('Lieblingshose')

    const { data } = readBackup(await archiveOf(db))

    expect(data.households).toHaveLength(2)
    expect(data.categories.length).toBeGreaterThan(0)
    expect(data.items).toHaveLength(1)
    expect(data.events).toHaveLength(1)
    expect(data.createdAt).toBe(5000)
  })

  it('legt Original und Vorschaubild je Stueck ab', async () => {
    const item = await addItem('Lieblingshose')

    const { images } = readBackup(await archiveOf(db))

    expect(images.has(item.id)).toBe(true)
    expect(new TextDecoder().decode(images.get(item.id)!.full)).toBe('full-Lieblingshose')
    expect(new TextDecoder().decode(images.get(item.id)!.thumb)).toBe('thumb-Lieblingshose')
  })

  it('kommt mit einem leeren Kleiderschrank zurecht', async () => {
    const { data, images } = readBackup(await archiveOf(db))

    expect(data.items).toEqual([])
    expect(images.size).toBe(0)
  })
})

describe('readBackup', () => {
  it('weist eine Datei ab, die gar kein ZIP ist', () => {
    expect(() => readBackup(new TextEncoder().encode('kein zip'))).toThrow(BackupError)
  })

  it('weist ein ZIP ohne daten.json ab', () => {
    const zip = zipSync({ 'egal.txt': new TextEncoder().encode('hallo') })

    expect(() => readBackup(zip)).toThrow(/keine Sicherung/)
  })

  it('weist beschaedigte Daten ab', () => {
    const zip = zipSync({ 'daten.json': new TextEncoder().encode('{kaputt') })

    expect(() => readBackup(zip)).toThrow(/beschädigt/)
  })

  it('weist ein unbekanntes Format ab, statt es zu raten', () => {
    const zip = zipSync({
      'daten.json': new TextEncoder().encode(
        JSON.stringify({ format: 99, items: [], households: [] }),
      ),
    })

    expect(() => readBackup(zip)).toThrow(/Format 99/)
  })

  it('weist eine unvollstaendige Sicherung ab', () => {
    const zip = zipSync({
      'daten.json': new TextEncoder().encode(JSON.stringify({ format: BACKUP_FORMAT })),
    })

    expect(() => readBackup(zip)).toThrow(/unvollständig/)
  })

  it('ueberspringt ein Stueck ohne Bilder, statt alles abzubrechen', async () => {
    const withImage = await addItem('Mit Bild')
    const { data } = readBackup(await archiveOf(db))

    // Bilder absichtlich weglassen.
    const zip = zipSync({
      'daten.json': new TextEncoder().encode(JSON.stringify(data)),
    })

    const result = readBackup(zip)
    expect(result.data.items.map((i) => i.id)).toEqual([withImage.id])
    expect(result.images.size).toBe(0)
  })
})

describe('importBackup', () => {
  it('stellt einen Bestand in einer leeren Datenbank wieder her', async () => {
    await seedIfEmpty(db, 1000)
    const item = await addItem('Lieblingshose')
    const archive = await archiveOf(db)

    const target = await freshDb()
    const result = await importBackup(target, archive)

    expect(result).toEqual({ items: 1, images: 1 })
    expect(await listHouseholds(target)).toHaveLength(2)
    expect((await listItems(target))[0]?.title).toBe('Lieblingshose')
    expect(await listEvents(target, item.id)).toHaveLength(1)
  })

  it('nimmt Outfits mit durch Export und Import', async () => {
    await seedIfEmpty(db, 1000)
    const hose = await addItem('Lieblingshose')
    await createOutfit(db, { name: 'Schultag', itemIds: [hose.id] }, 3000)
    const archive = await archiveOf(db)

    const target = await freshDb()
    await importBackup(target, archive)

    const [outfit] = await listOutfits(target)
    expect(outfit?.name).toBe('Schultag')
    // Der Verweis muss auf dasselbe Stueck zeigen, nicht auf ein neu vergebenes.
    expect(outfit?.itemIds).toEqual([hose.id])
  })

  it('behaelt einen selbst gewaehlten Trageort', async () => {
    /*
     * Der Trageort ist ein optionales Feld; JSON laesst fehlende Felder einfach weg.
     * Eine ausdrueckliche Angabe darf dabei nicht verloren gehen - sonst faellt die
     * Kategorie nach dem Einspielen still auf das Raten ueber den Namen zurueck.
     */
    await seedIfEmpty(db, 1000)
    const [hose] = await listCategories(db)
    await updateCategory(db, hose!.id, { slot: 'kopf' }, 3000)
    const archive = await archiveOf(db)

    const target = await freshDb()
    await importBackup(target, archive)

    const wiederhergestellt = (await listCategories(target)).find((c) => c.id === hose!.id)
    expect(wiederhergestellt?.slot).toBe('kopf')
    expect(slotFor(wiederhergestellt!)).toBe('kopf')
  })

  it('liest eine Sicherung ohne Outfits weiterhin', async () => {
    /*
     * Der Grund, warum das Format bei 1 bleibt: eine Sicherung, die vor den Outfits
     * entstanden ist, muss lesbar bleiben. Ein Sprung auf Format 2 haette jede
     * vorhandene Datei entwertet.
     */
    await seedIfEmpty(db, 1000)
    await addItem('Lieblingshose')
    const archive = await archiveOf(db)

    const { data } = readBackup(archive)
    delete (data as { outfits?: unknown }).outfits

    const alt = zipSync({ 'daten.json': new TextEncoder().encode(JSON.stringify(data)) })

    const target = await freshDb()
    await importBackup(target, alt)

    expect(await listOutfits(target)).toEqual([])
    expect(await listItems(target)).toHaveLength(1)
  })

  it('stellt die Bilder unveraendert wieder her', async () => {
    const item = await addItem('Lieblingshose')
    const archive = await archiveOf(db)

    const target = await freshDb()
    await importBackup(target, archive)

    const images = await getImages(target, item.id)
    expect(await images?.full.text()).toBe('full-Lieblingshose')
    expect(await images?.thumb.text()).toBe('thumb-Lieblingshose')
    expect(images?.full.type).toBe('image/jpeg')
  })

  it('behaelt Haushaltszuordnung und Verlauf', async () => {
    await seedIfEmpty(db, 1000)
    const [erster] = await listHouseholds(db)
    const item = await addItem('Lieblingshose')
    await moveItem(db, item.id, erster!.id, 3000)
    const archive = await archiveOf(db)

    const target = await freshDb()
    await importBackup(target, archive)

    expect((await listItems(target))[0]?.householdId).toBe(erster!.id)
    expect((await listEvents(target, item.id))[0]).toMatchObject({
      kind: 'moved',
      toName: 'Haushalt 1',
      timestamp: 3000,
    })
  })

  it('ersetzt einen vorhandenen Bestand vollstaendig', async () => {
    await seedIfEmpty(db, 1000)
    await addItem('Aus der Sicherung')
    const archive = await archiveOf(db)

    const target = await freshDb()
    await seedIfEmpty(target, 1000)
    await createItem(
      target,
      { title: 'Wird ersetzt', categoryId: null, householdId: null, full: blob('x'), thumb: blob('x') },
      2000,
    )

    await importBackup(target, archive)

    // Zusammenfuehren wuerde bedeuten zu entscheiden, welche Fassung gewinnt -
    // das kann niemand beantworten, also wird ersetzt.
    const titles = (await listItems(target)).map((i) => i.title)
    expect(titles).toEqual(['Aus der Sicherung'])
    expect(await listHouseholds(target)).toHaveLength(2)
  })

  it('uebersteht eine vollstaendige Rundreise ohne Verlust', async () => {
    await seedIfEmpty(db, 1000)
    const [erster] = await listHouseholds(db)
    await renameHousehold(db, erster!.id, 'Bei Mama', 1500)
    await addItem('Hose')
    await addItem('Shirt', erster!.id)

    const target = await freshDb()
    await importBackup(target, await archiveOf(db))

    expect((await listHouseholds(target)).map((h) => h.name)).toEqual([
      'Bei Mama',
      'Haushalt 2',
    ])
    expect((await listItems(target)).map((i) => i.title).sort()).toEqual(['Hose', 'Shirt'])
    expect((await listCategories(target)).length).toBe((await listCategories(db)).length)
  })

  it('schreibt bei einem kaputten Archiv gar nichts', async () => {
    await seedIfEmpty(db, 1000)
    await addItem('Bleibt erhalten')

    await expect(importBackup(db, new TextEncoder().encode('kein zip'))).rejects.toThrow(
      BackupError,
    )

    // Pruefung vor dem Schreiben: ein Fehlversuch darf nichts kosten.
    expect(await listItems(db)).toHaveLength(1)
    expect(await listHouseholds(db)).toHaveLength(2)
  })
})

describe('backupFileName', () => {
  it('enthaelt das Datum', () => {
    const name = backupFileName(new Date('2026-09-01T10:00:00').getTime())

    expect(name).toBe('kleiderschrank-2026-09-01.zip')
  })
})
