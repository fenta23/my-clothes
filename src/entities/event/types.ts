import type { Id } from '../../shared/db/ids.ts'

export type EventKind = 'created' | 'moved' | 'categoryChanged'

/**
 * Ein Eintrag im Verlauf eines Kleidungsstuecks.
 *
 * Namen werden als Kopie gespeichert, nicht als Verweis: nach einer Umbenennung soll
 * der Verlauf weiterhin erzaehlen, wie der Haushalt damals hiess.
 */
export interface ItemEvent {
  id: Id
  itemId: Id
  timestamp: number
  kind: EventKind
  /** Anzeigename der Herkunft; bei `created` null. */
  fromName: string | null
  /** Anzeigename des Ziels. */
  toName: string | null
}
