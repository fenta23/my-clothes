import type { ClothingItem } from '../entities/clothing/types.ts'
import { INBOX_NAME, type HouseholdRef } from '../entities/household/types.ts'
import type { Outfit } from '../entities/outfit/types.ts'
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

export const selectOutfits = (s: WardrobeState) => s.outfits

export const selectOutfitById =
  (id: Id | null) =>
  (s: WardrobeState): Outfit | null =>
    id === null ? null : (s.outfits.find((outfit) => outfit.id === id) ?? null)

/**
 * Die Stuecke eines Outfits, in der Reihenfolge seiner Liste.
 *
 * Unbekannte Kennungen fallen heraus. Vorkommen duerfen sie nicht - `deleteItem`
 * raeumt die Mitgliedschaft mit ab - aber ein fehlendes Stueck soll die Anzeige
 * nicht zerlegen.
 */
export const selectOutfitItems =
  (id: Id | null) =>
  (s: WardrobeState): ClothingItem[] => {
    const outfit = id === null ? null : s.outfits.find((o) => o.id === id)
    if (!outfit) return LEERE_STUECKE

    const byId = new Map(s.items.map((item) => [item.id, item]))

    return outfit.itemIds.flatMap((itemId) => {
      const item = byId.get(itemId)

      return item ? [item] : []
    })
  }

/** Eine stabile leere Liste - eine neue waere bei jedem Lesen eine "Aenderung". */
const LEERE_STUECKE: ClothingItem[] = []

/** Wo die Teile eines Outfits gerade liegen. */
export interface OutfitStatus {
  gesamt: number
  /** Ein Eintrag je Ort, in der Reihenfolge der Bahnen; die Mitte zuletzt. */
  jeHaushalt: { ref: HouseholdRef; name: string; anzahl: number }[]
  /** Gesetzt, wenn alles vollstaendig in einem Haushalt liegt. */
  komplettBei: Id | null
}

/**
 * Der eigentliche Gewinn der Outfits: die App weiss, wo jedes Teil liegt, und kann
 * damit die Frage beantworten, die sich morgens wirklich stellt.
 *
 * Wird bei jedem Lesen neu gebildet und braucht deshalb `outfitStatusEqual` als
 * Vergleich - sonst haelt `useSyncExternalStore` jedes Lesen fuer eine Aenderung.
 */
export const selectOutfitStatus =
  (id: Id | null) =>
  (s: WardrobeState): OutfitStatus => {
    const stuecke = selectOutfitItems(id)(s)

    const anzahlJeRef = new Map<HouseholdRef, number>()
    for (const item of stuecke) {
      anzahlJeRef.set(item.householdId, (anzahlJeRef.get(item.householdId) ?? 0) + 1)
    }

    const jeHaushalt: OutfitStatus['jeHaushalt'] = []
    for (const household of s.households) {
      const anzahl = anzahlJeRef.get(household.id)
      if (anzahl) jeHaushalt.push({ ref: household.id, name: household.name, anzahl })
    }

    const inDerMitte = anzahlJeRef.get(null)
    if (inDerMitte) jeHaushalt.push({ ref: null, name: INBOX_NAME, anzahl: inDerMitte })

    const einziger = jeHaushalt.length === 1 ? jeHaushalt[0] : undefined

    return {
      gesamt: stuecke.length,
      jeHaushalt,
      komplettBei: einziger && einziger.ref !== null ? einziger.ref : null,
    }
  }

export function outfitStatusEqual(a: OutfitStatus, b: OutfitStatus): boolean {
  return (
    a.gesamt === b.gesamt &&
    a.komplettBei === b.komplettBei &&
    a.jeHaushalt.length === b.jeHaushalt.length &&
    a.jeHaushalt.every((eintrag, index) => {
      const other = b.jeHaushalt[index]

      return (
        other !== undefined &&
        eintrag.ref === other.ref &&
        eintrag.name === other.name &&
        eintrag.anzahl === other.anzahl
      )
    })
  )
}
