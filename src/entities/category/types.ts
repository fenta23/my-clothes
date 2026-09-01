import type { Id } from '../../shared/db/ids.ts'

/**
 * Wo am Koerper ein Stueck sitzt - bestimmt seine Zeile in der Outfit-Figur.
 *
 * `ganz` ist der Einteiler (Kleid, Overall) und steht zwischen Ober- und Unterteil.
 * `sonstiges` landet in einer eigenen Zeile unter der Figur, statt sie zu verfaelschen.
 */
export type BodySlot = 'kopf' | 'oben' | 'ganz' | 'unten' | 'fuesse' | 'sonstiges'

export interface Category {
  id: Id
  name: string
  emoji: string
  colorHex: string
  sortOrder: number
  /**
   * Fehlt bei Kategorien, die vor den Outfits angelegt wurden - `slotFor` entscheidet
   * dann anhand des Namens. Bewusst nicht nachtraeglich in die Datenbank geschrieben:
   * siehe `slots.ts`.
   */
  slot?: BodySlot
  createdAt: number
  /** Datum der letzten Aenderung - vom Nutzer ausdruecklich gewuenscht. */
  updatedAt: number
}
