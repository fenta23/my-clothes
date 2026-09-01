import type { Id } from '../../shared/db/ids.ts'

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
