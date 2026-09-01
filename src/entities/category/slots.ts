import { DEFAULT_CATEGORIES } from './defaults.ts'
import type { BodySlot, Category } from './types.ts'

/** Reihenfolge auf der Figur, von oben nach unten. `sonstiges` steht ausserhalb. */
export const SLOT_ORDER: readonly BodySlot[] = ['kopf', 'oben', 'ganz', 'unten', 'fuesse']

export const SLOT_LABELS: Record<BodySlot, string> = {
  kopf: 'Kopf',
  oben: 'Oberteil',
  ganz: 'Einteiler',
  unten: 'Unterteil',
  fuesse: 'Füße',
  sonstiges: 'Sonstiges',
}

/** Alle waehlbaren Trageorte in der Reihenfolge, in der sie angeboten werden. */
export const ALL_SLOTS: readonly BodySlot[] = [...SLOT_ORDER, 'sonstiges']

const SLOT_BY_DEFAULT_NAME = new Map<string, BodySlot>(
  DEFAULT_CATEGORIES.map((seed) => [seed.name, seed.slot]),
)

/**
 * Der Trageort einer Kategorie, in drei Stufen.
 *
 * 1. Die ausdrueckliche Angabe des Nutzers gewinnt immer.
 * 2. Sonst der Name: Kategorien aus der Zeit vor den Outfits tragen noch ihre
 *    urspruenglichen Namen, die Figur stimmt damit vom ersten Oeffnen an.
 * 3. Sonst `sonstiges`.
 *
 * Bewusst eine reine Funktion statt eines Nachtragens in der Upgrade-Transaktion:
 * ein Pflichtfeld muesste alle Zeilen umschreiben, und schlaegt das fehl, bricht das
 * ganze Upgrade ab und die App oeffnet gar nicht mehr. Das Raten ueber den Namen ist
 * hier vertretbar, weil es nur ein Rueckfall ist und nie gespeichert wird - wer
 * umbenennt, stellt den Trageort einmal selbst ein und ist die Rateei fuer immer los.
 */
export function slotFor(category: Category): BodySlot {
  return category.slot ?? SLOT_BY_DEFAULT_NAME.get(category.name) ?? 'sonstiges'
}
