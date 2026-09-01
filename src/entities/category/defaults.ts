/** Startkategorien beim ersten Oeffnen der App. */

import type { BodySlot } from './types.ts'

export interface CategorySeed {
  name: string
  emoji: string
  colorHex: string
  slot: BodySlot
}

/*
 * Bewusst als Startpunkt gedacht, nicht als Vorgabe: alle Kategorien lassen sich
 * umbenennen, umfaerben oder loeschen.
 *
 * Die Reihenfolge hier ist die der Einstellungen, nicht die des Koerpers - dafuer
 * ist `slot` da. Beides zu vermischen waere bequem und faellt beim ersten Umsortieren
 * auf die Fuesse.
 */
export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { name: 'Hose', emoji: '👖', colorHex: '#4F7CFF', slot: 'unten' },
  { name: 'Kleid', emoji: '👗', colorHex: '#EC4899', slot: 'ganz' },
  { name: 'Rock', emoji: '🩱', colorHex: '#A855F7', slot: 'unten' },
  { name: 'T-Shirt', emoji: '👕', colorHex: '#22C55E', slot: 'oben' },
  { name: 'Pullover', emoji: '🧥', colorHex: '#F59E0B', slot: 'oben' },
  { name: 'Jacke', emoji: '🧥', colorHex: '#EF4444', slot: 'oben' },
  { name: 'Schuhe', emoji: '👟', colorHex: '#14B8A6', slot: 'fuesse' },
  { name: 'Unterwäsche', emoji: '🩲', colorHex: '#8B5CF6', slot: 'sonstiges' },
  { name: 'Socken', emoji: '🧦', colorHex: '#F97316', slot: 'fuesse' },
]
