import type { Id } from '../../shared/db/ids.ts'

/**
 * Eine benannte Zusammenstellung mehrerer Kleidungsstuecke.
 *
 * Bewusst ohne Haushalt: `moveItem` ist die einzige Stelle, die den Aufenthaltsort
 * eines Stuecks setzt. Eine Kopie im Outfit liefe still veraltet, sobald ein Teil
 * umzieht - und genau das passiert hier staendig. Der Ort wird deshalb aus den
 * Stuecken hergeleitet, nie abgelegt.
 */
export interface Outfit {
  id: Id
  name: string
  /** Reihenfolge der Aufnahme; die Anzeige sortiert selbst nach Trageort. */
  itemIds: Id[]
  createdAt: number
  updatedAt: number
}
