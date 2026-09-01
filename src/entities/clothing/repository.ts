import { newId, type Id } from '../../shared/db/ids.ts'
import type { Db } from '../db.ts'
import { eventIdsForItem, newEvent } from '../event/repository.ts'
import { laneName } from '../household/repository.ts'
import type { HouseholdRef } from '../household/types.ts'
import type { ClothingItem, ItemImages } from './types.ts'

/*
 * Schreibzugriffe auf Kleidung liegen ausschliesslich hier. Insbesondere `moveItem`
 * ist die EINZIGE Stelle, die `householdId` setzt - nur so kann der Verlauf nicht
 * umgangen werden, egal ob der Wechsel per Ziehen, aus der Detailansicht oder beim
 * Anlegen ausgeloest wird.
 */

export async function listItems(db: Db): Promise<ClothingItem[]> {
  const items = await db.getAll('items')

  // Neueste zuerst: frisch fotografierte Teile sollen vorne in der Bahn liegen.
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Bilder eines Kleidungsstuecks - beim Lesen wieder als Blob.
 *
 * Gespeichert sind ArrayBuffer (siehe StoredImages); die Umwandlung passiert hier an
 * der Grenze, damit der Rest der App weiterhin mit Blobs arbeitet.
 */
export async function getImages(db: Db, itemId: Id): Promise<ItemImages | undefined> {
  const stored = await db.get('images', itemId)
  if (!stored) return undefined

  return {
    id: stored.id,
    full: new Blob([stored.full], { type: stored.fullType }),
    thumb: new Blob([stored.thumb], { type: stored.thumbType }),
  }
}

export interface CreateItemInput {
  title: string
  categoryId: Id | null
  householdId: HouseholdRef
  full: Blob
  thumb: Blob
}

/** Legt ein Kleidungsstueck samt Bildern an und protokolliert den Zugang. */
export async function createItem(
  db: Db,
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
    tx.objectStore('events').add(
      newEvent({ itemId: item.id, timestamp: at, kind: 'created', toName }),
    ),
    tx.done,
  ])

  return item
}

/**
 * Verschiebt ein Kleidungsstueck in eine Bahn - die einzige Stelle, die das darf.
 *
 * Ein Ablegen in der Bahn, in der das Teil schon liegt, ist kein Ereignis und wird
 * stillschweigend verworfen.
 */
export async function moveItem(
  db: Db,
  itemId: Id,
  target: HouseholdRef,
  at = Date.now(),
): Promise<ClothingItem | null> {
  const item = await db.get('items', itemId)
  if (!item || item.householdId === target) return item ?? null

  const [fromName, toName] = await Promise.all([
    laneName(db, item.householdId),
    laneName(db, target),
  ])

  const updated: ClothingItem = { ...item, householdId: target, updatedAt: at }

  const tx = db.transaction(['items', 'events'], 'readwrite')

  await Promise.all([
    tx.objectStore('items').put(updated),
    tx.objectStore('events').add(
      newEvent({ itemId, timestamp: at, kind: 'moved', fromName, toName }),
    ),
    tx.done,
  ])

  return updated
}

/** Aendert die Kategorie und protokolliert den Wechsel. */
export async function setItemCategory(
  db: Db,
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
    tx.objectStore('events').add(
      newEvent({
        itemId,
        timestamp: at,
        kind: 'categoryChanged',
        fromName: from?.name ?? null,
        toName: to?.name ?? null,
      }),
    ),
    tx.done,
  ])

  return updated
}

export async function renameItem(
  db: Db,
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

/** Loescht ein Kleidungsstueck samt Bildern und Verlauf. */
export async function deleteItem(db: Db, itemId: Id): Promise<void> {
  const eventIds = await eventIdsForItem(db, itemId)

  const tx = db.transaction(['items', 'images', 'events'], 'readwrite')

  await Promise.all([
    tx.objectStore('items').delete(itemId),
    tx.objectStore('images').delete(itemId),
    ...eventIds.map((id) => tx.objectStore('events').delete(id)),
    tx.done,
  ])
}

/** Anzahl der Kleidungsstuecke je Kategorie - fuer die Warnung vor dem Loeschen. */
export async function countItemsPerCategory(db: Db): Promise<Map<Id, number>> {
  const items = await db.getAll('items')
  const counts = new Map<Id, number>()

  for (const item of items) {
    if (!item.categoryId) continue
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
  }

  return counts
}
