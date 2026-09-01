import { newId, type Id } from '../../shared/db/ids.ts'
import type { Db } from '../db.ts'
import { INBOX_NAME, type Household, type HouseholdRef } from './types.ts'

export async function listHouseholds(db: Db): Promise<Household[]> {
  return db.getAllFromIndex('households', 'by-position')
}

export async function renameHousehold(
  db: Db,
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

/**
 * Anzeigename einer Bahn - fuer den Verlauf.
 *
 * Der Name wird bewusst kopiert und nicht verlinkt: nach einer Umbenennung soll der
 * Verlauf weiterhin erzaehlen, wie der Haushalt zum Zeitpunkt des Wechsels hiess.
 */
export async function laneName(db: Db, ref: HouseholdRef): Promise<string> {
  if (ref === null) return INBOX_NAME

  const household = await db.get('households', ref)

  return household?.name ?? INBOX_NAME
}

export function newHousehold(name: string, position: number, at: number): Household {
  return { id: newId(), name, position, createdAt: at, updatedAt: at }
}
