import type { Id } from '../../shared/db/ids.ts'

export interface Household {
  id: Id
  name: string
  /** 0 = obere Bahn, 1 = untere Bahn. */
  position: number
  createdAt: number
  updatedAt: number
}

/**
 * Wo ein Kleidungsstueck liegt.
 *
 * `null` bedeutet die mittlere Bahn - noch nicht zugeordnet. Bewusst kein dritter
 * Enum-Wert: so bleiben Abfragen und Vergleiche ueberall trivial.
 */
export type HouseholdRef = Id | null

/** Anzeigename der mittleren Bahn - auch in der Historie. */
export const INBOX_NAME = 'Neu'
