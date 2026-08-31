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
} from './types.ts'

type DB = IDBPDatabase<ClothesDB>

/*
 * Alle Schreibzugriffe laufen ueber dieses Modul. Insbesondere `moveItem` ist die
 * EINZIGE Stelle, die `householdId` setzt - nur so kann die Historie nicht umgangen
 * werden, egal ob der Wechsel per Drag & Drop, aus der Detailansicht oder beim
 * Anlegen ausgeloest wird.
 */

// ---------------------------------------------------------------- Erststart

/**
 * Legt Haushalte und Startkategorien an, falls die Datenbank leer ist.
 *
 * Ist bewusst idempotent: ein zweiter Aufruf darf nichts verdoppeln, weil React im
 * StrictMode Effekte doppelt ausfuehrt.
 */
export async function seedIfEmpty(db: DB, at = Date.now()): Promise<void> {
  const existing = await db.count('households')
  if (existing > 0) return

  const tx = db.transaction(['households', 'categories'], 'readwrite')

  await Promise.all(
    DEFAULT_HOUSEHOLD_NAMES.map((name, position) =>
      tx.objectStore('households').add({
        id: newId(),
        name,
        position,
        createdAt: at,
        updatedAt: at,
      }),
    ),
  )

  await Promise.all(
    DEFAULT_CATEGORIES.map((seed, index) =>
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
  )

  await tx.done
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

export async function getImages(db: DB, itemId: Id) {
  return db.get('images', itemId)
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

  const tx = db.transaction(['items', 'images', 'events'], 'readwrite')

  await tx.objectStore('items').add(item)
  await tx.objectStore('images').add({ id: item.id, full: input.full, thumb: input.thumb })
  await tx.objectStore('events').add({
    id: newId(),
    itemId: item.id,
    timestamp: at,
    kind: 'created',
    fromName: null,
    toName,
  })

  await tx.done

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

  await tx.objectStore('items').put(updated)
  await tx.objectStore('events').add({
    id: newId(),
    itemId,
    timestamp: at,
    kind: 'moved',
    fromName,
    toName,
  })

  await tx.done

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

  await tx.objectStore('items').put(updated)
  await tx.objectStore('events').add({
    id: newId(),
    itemId,
    timestamp: at,
    kind: 'categoryChanged',
    fromName: from?.name ?? null,
    toName: to?.name ?? null,
  })

  await tx.done

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

  await tx.objectStore('items').delete(itemId)
  await tx.objectStore('images').delete(itemId)
  await Promise.all(eventIds.map((id) => tx.objectStore('events').delete(id)))

  await tx.done
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

  await tx.objectStore('categories').delete(id)
  await Promise.all(
    affected.map((item) =>
      tx.objectStore('items').put({ ...item, categoryId: null, updatedAt: at }),
    ),
  )

  await tx.done

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
