/**
 * Datenmodell der App.
 *
 * Zwei Entscheidungen praegen alles Weitere:
 *
 * 1. `householdId === null` bedeutet "mittlere Bahn" (neu / noch nicht zugeordnet).
 *    Kein dritter Zustand, keine Sonderfaelle in Abfragen.
 *
 * 2. Ereignisse speichern Haushaltsnamen als Kopie, nicht nur als Verweis. Wird ein
 *    Haushalt spaeter umbenannt, bleibt die Historie trotzdem lesbar - sie erzaehlt,
 *    wie es damals hiess.
 */

export type Id = string

/** `null` = mittlere Bahn, sonst die ID eines Haushalts. */
export type HouseholdRef = Id | null

export interface Household {
  id: Id
  name: string
  /** 0 = obere Bahn, 1 = untere Bahn. */
  position: number
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: Id
  name: string
  emoji: string
  colorHex: string
  sortOrder: number
  createdAt: number
  /** Datum der letzten Aenderung - vom Nutzer ausdruecklich gewuenscht. */
  updatedAt: number
}

export interface ClothingItem {
  id: Id
  title: string
  categoryId: Id | null
  householdId: HouseholdRef
  createdAt: number
  updatedAt: number
}

export type EventKind = 'created' | 'moved' | 'categoryChanged'

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

/** Bilder liegen getrennt von den Metadaten, damit Listenabfragen keine Blobs laden. */
export interface ItemImages {
  id: Id
  full: Blob
  thumb: Blob
}

/** Anzeigename der mittleren Bahn - auch in der Historie. */
export const INBOX_NAME = 'Neu'
