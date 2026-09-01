import { newId, type Id } from '../../shared/db/ids.ts'
import type { Db } from '../db.ts'
import type { Outfit } from './types.ts'

/** Alle Outfits, neueste zuerst - wie bei der Kleidung. */
export async function listOutfits(db: Db): Promise<Outfit[]> {
  const outfits = await db.getAll('outfits')

  return outfits.sort((a, b) => b.createdAt - a.createdAt)
}

export async function createOutfit(
  db: Db,
  input: { name: string; itemIds: Id[] },
  at = Date.now(),
): Promise<Outfit> {
  const outfit: Outfit = {
    id: newId(),
    name: input.name.trim(),
    itemIds: [...input.itemIds],
    createdAt: at,
    updatedAt: at,
  }

  await db.add('outfits', outfit)

  return outfit
}

export async function renameOutfit(
  db: Db,
  id: Id,
  name: string,
  at = Date.now(),
): Promise<Outfit | null> {
  const outfit = await db.get('outfits', id)
  if (!outfit) return null

  const updated: Outfit = { ...outfit, name: name.trim(), updatedAt: at }
  await db.put('outfits', updated)

  return updated
}

/** Ersetzt die Teile eines Outfits vollstaendig. */
export async function setOutfitItems(
  db: Db,
  id: Id,
  itemIds: Id[],
  at = Date.now(),
): Promise<Outfit | null> {
  const outfit = await db.get('outfits', id)
  if (!outfit) return null

  const updated: Outfit = { ...outfit, itemIds: [...itemIds], updatedAt: at }
  await db.put('outfits', updated)

  return updated
}

export async function deleteOutfit(db: Db, id: Id): Promise<void> {
  await db.delete('outfits', id)
}
