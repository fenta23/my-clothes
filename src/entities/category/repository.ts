import { newId, type Id } from '../../shared/db/ids.ts'
import type { Db } from '../db.ts'
import type { BodySlot, Category } from './types.ts'

export async function listCategories(db: Db): Promise<Category[]> {
  return db.getAllFromIndex('categories', 'by-sortOrder')
}

export async function createCategory(
  db: Db,
  input: { name: string; emoji: string; colorHex: string; slot?: BodySlot },
  at = Date.now(),
): Promise<Category> {
  const existing = await db.getAll('categories')
  const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1)

  const category = newCategory({ ...input, sortOrder: maxOrder + 1 }, at)
  await db.add('categories', category)

  return category
}

export function newCategory(
  input: { name: string; emoji: string; colorHex: string; sortOrder: number; slot?: BodySlot },
  at: number,
): Category {
  return {
    id: newId(),
    name: input.name.trim(),
    emoji: input.emoji,
    colorHex: input.colorHex,
    sortOrder: input.sortOrder,
    slot: input.slot,
    createdAt: at,
    updatedAt: at,
  }
}

/** Aendert eine Kategorie und schreibt das Aenderungsdatum fort. */
export async function updateCategory(
  db: Db,
  id: Id,
  patch: Partial<Pick<Category, 'name' | 'emoji' | 'colorHex' | 'sortOrder' | 'slot'>>,
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
 *
 * Greift damit bewusst in den Kleidungs-Store: die Regel gehoert zum Loeschen der
 * Kategorie, nicht zum Kleidungsstueck.
 */
export async function deleteCategory(db: Db, id: Id, at = Date.now()): Promise<number> {
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

/**
 * Verschiebt eine Kategorie in der Reihenfolge um eine Position.
 *
 * Tauscht die Sortiernummern mit dem Nachbarn, statt alle neu zu vergeben - so bleibt
 * die Aenderung auf zwei Datensaetze begrenzt. Am Rand der Liste passiert nichts;
 * das ist kein Fehler, sondern das erwartete Verhalten.
 */
export async function moveCategory(
  db: Db,
  id: Id,
  direction: 'up' | 'down',
  at = Date.now(),
): Promise<boolean> {
  const ordered = await listCategories(db)
  const index = ordered.findIndex((c) => c.id === id)
  if (index === -1) return false

  const current = ordered[index]
  const neighbour = ordered[direction === 'up' ? index - 1 : index + 1]
  if (!current || !neighbour) return false

  const tx = db.transaction('categories', 'readwrite')

  await Promise.all([
    tx.store.put({ ...current, sortOrder: neighbour.sortOrder, updatedAt: at }),
    tx.store.put({ ...neighbour, sortOrder: current.sortOrder, updatedAt: at }),
    tx.done,
  ])

  return true
}
