import { newId, type Id } from '../../shared/db/ids.ts'
import type { Db } from '../db.ts'
import type { EventKind, ItemEvent } from './types.ts'

/** Eintraege eines Kleidungsstuecks, neueste zuerst. */
export async function listEvents(db: Db, itemId: Id): Promise<ItemEvent[]> {
  const events = await db.getAllFromIndex('events', 'by-item', itemId)

  return events.sort((a, b) => b.timestamp - a.timestamp)
}

export async function listAllEvents(db: Db): Promise<ItemEvent[]> {
  return db.getAll('events')
}

export async function eventIdsForItem(db: Db, itemId: Id): Promise<Id[]> {
  return (await db.getAllFromIndex('events', 'by-item', itemId)).map((e) => e.id)
}

/**
 * Baut einen Eintrag, schreibt ihn aber nicht.
 *
 * Absichtlich getrennt: der Eintrag muss in derselben Transaktion landen wie die
 * Aenderung, die er beschreibt - sonst koennte eine Verschiebung ohne Verlauf
 * ueberleben.
 */
export function newEvent(input: {
  itemId: Id
  timestamp: number
  kind: EventKind
  fromName?: string | null
  toName?: string | null
}): ItemEvent {
  return {
    id: newId(),
    itemId: input.itemId,
    timestamp: input.timestamp,
    kind: input.kind,
    fromName: input.fromName ?? null,
    toName: input.toName ?? null,
  }
}
