/**
 * Reine Verschiebe-Logik des Spikes.
 *
 * Bewusst frei von React und dnd-kit: so laesst sich das Verhalten im Test pruefen,
 * ohne eine Zeigergeste simulieren zu muessen. Die Struktur nimmt vorweg, was spaeter
 * `moveItem` im Data-Layer macht.
 */

export type LaneId = 'top' | 'inbox' | 'bottom'

export const LANE_IDS: readonly LaneId[] = ['top', 'inbox', 'bottom']

export interface SpikeCard {
  id: string
  label: string
  lane: LaneId
}

export interface MoveRecord {
  cardId: string
  from: LaneId
  to: LaneId
  at: number
}

export interface SpikeState {
  cards: SpikeCard[]
  history: MoveRecord[]
}

export function isLaneId(value: unknown): value is LaneId {
  return typeof value === 'string' && (LANE_IDS as readonly string[]).includes(value)
}

/**
 * Verschiebt eine Karte in eine Bahn und protokolliert den Wechsel.
 *
 * Gibt den unveraenderten Zustand zurueck, wenn die Karte unbekannt ist oder schon
 * in der Zielbahn liegt - ein Drop auf die eigene Bahn ist kein Ereignis.
 */
export function moveCard(
  state: SpikeState,
  cardId: string,
  target: LaneId,
  at: number,
): SpikeState {
  const card = state.cards.find((c) => c.id === cardId)
  if (!card || card.lane === target) return state

  return {
    cards: state.cards.map((c) => (c.id === cardId ? { ...c, lane: target } : c)),
    history: [{ cardId, from: card.lane, to: target, at }, ...state.history],
  }
}

export function cardsInLane(state: SpikeState, lane: LaneId): SpikeCard[] {
  return state.cards.filter((c) => c.lane === lane)
}

/** Startdaten: genug Karten, dass jede Bahn tatsaechlich horizontal scrollen muss. */
export function createInitialState(perLane = 8): SpikeState {
  const cards: SpikeCard[] = []

  for (const lane of LANE_IDS) {
    for (let i = 1; i <= perLane; i += 1) {
      cards.push({ id: `${lane}-${i}`, label: `${lane[0]?.toUpperCase()}${i}`, lane })
    }
  }

  return { cards, history: [] }
}
