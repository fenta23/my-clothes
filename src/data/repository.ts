import type { IDBPDatabase } from 'idb'

import type { ClothesDB } from './db.ts'
import { DEFAULT_CATEGORIES, DEFAULT_HOUSEHOLD_NAMES } from './defaults.ts'
import { newId } from './ids.ts'
import {
  INBOX_NAME,
  type Category,
  type ClothingItem,
  type Household,
  type HouseholdRef,
  type Id,
  type ItemEvent,
  type ItemImages,
} from './types.ts'

type DB = IDBPDatabase<ClothesDB>

/*
 * WICHTIG fuer alle Transaktionen in diesem Modul: die einzelnen Anfragen werden
 * gemeinsam ueber Promise.all abgewartet, nie nacheinander mit eigenem await.
 *
 * Safari beendet eine IndexedDB-Transaktion, sobald die Microtask-Queue zwischen
 * zwei Anfragen leerlaeuft. Ein `await store.add(a)` gefolgt von `await
 * store.add(b)` schlaegt dort mit TransactionInactiveError fehl - in Chromium
 * dagegen nicht. Das ist genau der Browser, in dem die App laufen soll.
 *
 * Alle Schreibzugriffe laufen ueber dieses Modul. Insbesondere `moveItem` ist die
 * EINZIGE Stelle, die `householdId` setzt - nur so kann die Historie nicht umgangen
 * werden, egal ob der Wechsel per Drag & Drop, aus der Detailansicht oder beim
 * Anlegen ausgeloest wird.
 */

// ---------------------------------------------------------------- Erststart

/**
 * Legt Haushalte und Startkategorien an, falls die Datenbank leer ist.
 *
 * Pruefung und Anlegen liegen zwingend in EINER Transaktion.
 *
 * React fuehrt Effekte im StrictMode doppelt aus, und zwar ueberlappend: beide
 * Laeufe fragen "ist die Datenbank leer?", bevor einer geschrieben hat - und beide
 * legen an. Ergebnis waren vier Haushalte und jede Kategorie doppelt. Getrennte
 * Aufrufe zu zaehlen und danach zu schreiben reicht deshalb nicht; IndexedDB
 * serialisiert aber Schreibtransaktionen mit gleichem Geltungsbereich, sodass die
 * zweite Transaktion die Eintraege der ersten sieht.
 */
export async function seedIfEmpty(db: DB, at = Date.now()): Promise<void> {
  const tx = db.transaction(['households', 'categories'], 'readwrite')

  if ((await tx.objectStore('households').count()) > 0) {
    await tx.done
    return
  }

  await Promise.all([
    ...DEFAULT_HOUSEHOLD_NAMES.map((name, position) =>
      tx.objectStore('households').add({
        id: newId(),
        name,
        position,
        createdAt: at,
        updatedAt: at,
      }),
    ),
    ...DEFAULT_CATEGORIES.map((seed, index) =>
      tx.objectStore('categories').add({
        id: newId(),
        name: seed.name,
        emoji: seed.emoji,
        colorHex: seed.colorHex,
        sortOrder: index,
        createdAt: at,
        updatedAt: at,
      }),
    ),
    tx.done,
  ])
}

// ---------------------------------------------------------------- Lesen

export async function listHouseholds(db: DB): Promise<Household[]> {
  return db.getAllFromIndex('households', 'by-position')
}

export async function listCategories(db: DB): Promise<Category[]> {
  return db.getAllFromIndex('categories', 'by-sortOrder')
}

export async function listItems(db: DB): Promise<ClothingItem[]> {
  const items = await db.getAll('items')

  // Neueste zuerst: frisch fotografierte Teile sollen vorne in der Bahn liegen.
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

/** Ereignisse eines Kleidungsstuecks, neueste zuerst. */
export async function listEvents(db: DB, itemId: Id): Promise<ItemEvent[]> {
  const events = await db.getAllFromIndex('events', 'by-item', itemId)

  return events.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Bilder eines Kleidungsstuecks - beim Lesen wieder als Blob.
 *
 * Gespeichert sind ArrayBuffer (siehe StoredImages); die Umwandlung passiert hier
 * an der Grenze, damit der Rest der App weiterhin mit Blobs arbeitet.
 */
export async function getImages(db: DB, itemId: Id): Promise<ItemImages | undefined> {
  const stored = await db.get('images', itemId)
  if (!stored) return undefined

  return {
    id: stored.id,
    full: new Blob([stored.full], { type: stored.fullType }),
    thumb: new Blob([stored.thumb], { type: stored.thumbType }),
  }
}

// ---------------------------------------------------------------- Hilfen

/**
 * Anzeigename einer Bahn - fuer die Historie.
 *
 * Der Name wird bewusst kopiert und nicht verlinkt: nach einer Umbenennung soll die
 * Historie weiterhin erzaehlen, wie der Haushalt zum Zeitpunkt des Wechsels hiess.
 */
async function laneName(db: DB, ref: HouseholdRef): Promise<string> {
  if (ref === null) return INBOX_NAME

  const household = await db.get('households', ref)

  return household?.name ?? INBOX_NAME
}

// ---------------------------------------------------------------- Kleidung

export interface CreateItemInput {
  title: string
  categoryId: Id | null
  householdId: HouseholdRef
  full: Blob
  thumb: Blob
}

/** Legt ein Kleidungsstueck samt Bildern an und protokolliert den Zugang. */
export async function createItem(
  db: DB,
  input: CreateItemInput,
  at = Date.now(),
): Promise<ClothingItem> {
  const item: ClothingItem = {
    id: newId(),
    title: input.title.trim(),
    categoryId: input.categoryId,
    householdId: input.householdId,
    createdAt: at,
    updatedAt: at,
  }

  const toName = await laneName(db, input.householdId)

  // Vor der Transaktion auslesen: innerhalb wuerde das Warten auf einen
  // Nicht-IDB-Vorgang die Transaktion vorzeitig beenden.
  const [full, thumb] = await Promise.all([
    input.full.arrayBuffer(),
    input.thumb.arrayBuffer(),
  ])

  const tx = db.transaction(['items', 'images', 'events'], 'readwrite')

  await Promise.all([
    tx.objectStore('items').add(item),
    tx.objectStore('images').add({
      id: item.id,
      full,
      fullType: input.full.type,
      thumb,
      thumbType: input.thumb.type,
    }),
    tx.objectStore('events').add({
      id: newId(),
      itemId: item.id,
      timestamp: at,
      kind: 'created',
      fromName: null,
      toName,
    }),
    tx.done,
  ])

  return item
}

/**
 * Verschiebt ein Kleidungsstueck in eine Bahn - die einzige Stelle, die das darf.
 *
 * Ein Drop auf die Bahn, in der das Teil schon liegt, ist kein Ereignis und wird
 * stillschweigend verworfen.
 */
export async function moveItem(
  db: DB,
  itemId: Id,
  target: HouseholdRef,
  at = Date.now(),
): Promise<ClothingItem | null> {
  const item = await db.get('items', itemId)
  if (!item || item.householdId === target) return item ?? null

  const fromName = await laneName(db, item.householdId)
  const toName = await laneName(db, target)

  const updated: ClothingItem = { ...item, householdId: target, updatedAt: at }

  const tx = db.transaction(['items', 'events'], 'readwrite')

  await Promise.all([
    tx.objectStore('items').put(updated),
    tx.objectStore('events').add({
      id: newId(),
      itemId,
      timestamp: at,
      kind: 'moved',
      fromName,
      toName,
    }),
    tx.done,
  ])

  return updated
}

/** Aendert die Kategorie und protokolliert den Wechsel. */
export async function setItemCategory(
  db: DB,
  itemId: Id,
  categoryId: Id | null,
  at = Date.now(),
): Promise<ClothingItem | null> {
  const item = await db.get('items', itemId)
  if (!item || item.categoryId === categoryId) return item ?? null

  const [from, to] = await Promise.all([
    item.categoryId ? db.get('categories', item.categoryId) : undefined,
    categoryId ? db.get('categories', categoryId) : undefined,
  ])

  const updated: ClothingItem = { ...item, categoryId, updatedAt: at }

  const tx = db.transaction(['items', 'events'], 'readwrite')

  await Promise.all([
    tx.objectStore('items').put(updated),
    tx.objectStore('events').add({
      id: newId(),
      itemId,
      timestamp: at,
      kind: 'categoryChanged',
      fromName: from?.name ?? null,
      toName: to?.name ?? null,
    }),
    tx.done,
  ])

  return updated
}

export async function renameItem(
  db: DB,
  itemId: Id,
  title: string,
  at = Date.now(),
): Promise<ClothingItem | null> {
  const item = await db.get('items', itemId)
  if (!item) return null

  const updated: ClothingItem = { ...item, title: title.trim(), updatedAt: at }
  await db.put('items', updated)

  return updated
}

/** Loescht ein Kleidungsstueck samt Bildern und Historie. */
export async function deleteItem(db: DB, itemId: Id): Promise<void> {
  const eventIds = (await db.getAllFromIndex('events', 'by-item', itemId)).map((e) => e.id)

  const tx = db.transaction(['items', 'images', 'events'], 'readwrite')

  await Promise.all([
    tx.objectStore('items').delete(itemId),
    tx.objectStore('images').delete(itemId),
    ...eventIds.map((id) => tx.objectStore('events').delete(id)),
    tx.done,
  ])
}

// ---------------------------------------------------------------- Kategorien

export async function createCategory(
  db: DB,
  input: { name: string; emoji: string; colorHex: string },
  at = Date.now(),
): Promise<Category> {
  const existing = await db.getAll('categories')
  const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1)

  const category: Category = {
    id: newId(),
    name: input.name.trim(),
    emoji: input.emoji,
    colorHex: input.colorHex,
    sortOrder: maxOrder + 1,
    createdAt: at,
    updatedAt: at,
  }

  await db.add('categories', category)

  return category
}

/** Aendert eine Kategorie und schreibt das Aenderungsdatum fort. */
export async function updateCategory(
  db: DB,
  id: Id,
  patch: Partial<Pick<Category, 'name' | 'emoji' | 'colorHex' | 'sortOrder'>>,
  at = Date.now(),
): Promise<Category | null> {
  const category = await db.get('categories', id)
  if (!category) return null

  const updated: Category = {
    ...category,
    ...patch,
    name: patch.name === undefined ? category.name : patch.name.trim(),
    updatedAt: at,
  }

  await db.put('categories', updated)

  return updated
}

/**
 * Loescht eine Kategorie. Betroffene Kleidungsstuecke bleiben erhalten und werden
 * unkategorisiert - Kleidung geht nie verloren, weil eine Schublade verschwindet.
 */
export async function deleteCategory(db: DB, id: Id, at = Date.now()): Promise<number> {
  const affected = await db.getAllFromIndex('items', 'by-category', id)

  const tx = db.transaction(['categories', 'items'], 'readwrite')

  await Promise.all([
    tx.objectStore('categories').delete(id),
    ...affected.map((item) =>
      tx.objectStore('items').put({ ...item, categoryId: null, updatedAt: at }),
    ),
    tx.done,
  ])

  return affected.length
}

// ---------------------------------------------------------------- Haushalte

export async function renameHousehold(
  db: DB,
  id: Id,
  name: string,
  at = Date.now(),
): Promise<Household | null> {
  const household = await db.get('households', id)
  if (!household) return null

  const updated: Household = { ...household, name: name.trim(), updatedAt: at }
  await db.put('households', updated)

  return updated
}
