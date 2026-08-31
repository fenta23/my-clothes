/** Startdaten beim ersten Oeffnen der App. */

export interface CategorySeed {
  name: string
  emoji: string
  colorHex: string
}

/*
 * Bewusst als Startpunkt gedacht, nicht als Vorgabe: alle Kategorien lassen sich
 * umbenennen, umfaerben oder loeschen.
 */
export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { name: 'Hose', emoji: '👖', colorHex: '#4F7CFF' },
  { name: 'Kleid', emoji: '👗', colorHex: '#EC4899' },
  { name: 'Rock', emoji: '🩱', colorHex: '#A855F7' },
  { name: 'T-Shirt', emoji: '👕', colorHex: '#22C55E' },
  { name: 'Pullover', emoji: '🧥', colorHex: '#F59E0B' },
  { name: 'Jacke', emoji: '🧥', colorHex: '#EF4444' },
  { name: 'Schuhe', emoji: '👟', colorHex: '#14B8A6' },
  { name: 'Unterwäsche', emoji: '🩲', colorHex: '#8B5CF6' },
  { name: 'Socken', emoji: '🧦', colorHex: '#F97316' },
]

export const DEFAULT_HOUSEHOLD_NAMES: readonly [string, string] = [
  'Haushalt 1',
  'Haushalt 2',
]
