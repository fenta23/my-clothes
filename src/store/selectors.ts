import type { ClothingItem } from '../entities/clothing/types.ts'
import type { HouseholdRef } from '../entities/household/types.ts'
import type { Id } from '../shared/db/ids.ts'
import type { WardrobeState } from './wardrobeStore.ts'

/**
 * Benannte Selektoren statt anonymer Funktionen an der Aufrufstelle.
 *
 * Eine Pfeilfunktion direkt im Aufruf bekaeme bei jedem Rendern eine neue Identitaet
 * und wuerde den Zwischenspeicher in `useStoreSelector` wertlos machen. Ausserdem
 * sind sie so einzeln pruefbar.
 */

export const selectHouseholds = (s: WardrobeState) => s.households
export const selectCategories = (s: WardrobeState) => s.categories
export const selectItems = (s: WardrobeState) => s.items
export const selectStatus = (s: WardrobeState) => s.status
export const selectError = (s: WardrobeState) => s.error

export const selectItemsIn =
  (household: HouseholdRef) =>
  (s: WardrobeState): ClothingItem[] =>
    s.items.filter((item) => item.householdId === household)

export const selectItemById =
  (id: Id | null) =>
  (s: WardrobeState): ClothingItem | null =>
    id === null ? null : (s.items.find((item) => item.id === id) ?? null)

/**
 * Anzahl Kleidungsstuecke je Kategorie.
 *
 * Aus dem geladenen Bestand abgeleitet statt getrennt gehalten: so kann die Zahl
 * niemals von der Anzeige abweichen.
 */
export function selectItemsPerCategory(s: WardrobeState): Map<Id, number> {
  const counts = new Map<Id, number>()

  for (const item of s.items) {
    if (!item.categoryId) continue
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
  }

  return counts
}
