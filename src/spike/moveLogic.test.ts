import { describe, expect, it } from 'vitest'

import {
  cardsInLane,
  createInitialState,
  isLaneId,
  moveCard,
  type SpikeState,
} from './moveLogic.ts'

const base: SpikeState = {
  cards: [
    { id: 'a', label: 'A', lane: 'inbox' },
    { id: 'b', label: 'B', lane: 'top' },
  ],
  history: [],
}

describe('moveCard', () => {
  it('verschiebt eine Karte in die Zielbahn', () => {
    const next = moveCard(base, 'a', 'top', 1000)

    expect(next.cards.find((c) => c.id === 'a')?.lane).toBe('top')
  })

  it('protokolliert Herkunft, Ziel und Zeitpunkt', () => {
    const next = moveCard(base, 'a', 'bottom', 1700000000000)

    expect(next.history).toEqual([
      { cardId: 'a', from: 'inbox', to: 'bottom', at: 1700000000000 },
    ])
  })

  it('stellt den neuesten Eintrag nach vorne', () => {
    const next = moveCard(moveCard(base, 'a', 'top', 1), 'b', 'bottom', 2)

    expect(next.history.map((h) => h.cardId)).toEqual(['b', 'a'])
  })

  it('ignoriert einen Drop auf die eigene Bahn', () => {
    expect(moveCard(base, 'b', 'top', 1)).toBe(base)
  })

  it('ignoriert eine unbekannte Karte', () => {
    expect(moveCard(base, 'gibtsnicht', 'top', 1)).toBe(base)
  })

  it('veraendert den Ausgangszustand nicht', () => {
    moveCard(base, 'a', 'top', 1)

    expect(base.cards.find((c) => c.id === 'a')?.lane).toBe('inbox')
    expect(base.history).toHaveLength(0)
  })
})

describe('cardsInLane', () => {
  it('liefert nur die Karten der gefragten Bahn', () => {
    expect(cardsInLane(base, 'inbox').map((c) => c.id)).toEqual(['a'])
  })

  it('liefert eine leere Liste fuer eine leere Bahn', () => {
    expect(cardsInLane(base, 'bottom')).toEqual([])
  })
})

describe('isLaneId', () => {
  it('erkennt gueltige Bahnen', () => {
    expect(isLaneId('top')).toBe(true)
    expect(isLaneId('inbox')).toBe(true)
  })

  it('weist alles andere ab', () => {
    expect(isLaneId('irgendwas')).toBe(false)
    expect(isLaneId(null)).toBe(false)
    expect(isLaneId(42)).toBe(false)
  })
})

describe('createInitialState', () => {
  it('verteilt gleich viele Karten auf alle drei Bahnen', () => {
    const state = createInitialState(4)

    expect(state.cards).toHaveLength(12)
    expect(cardsInLane(state, 'top')).toHaveLength(4)
    expect(cardsInLane(state, 'inbox')).toHaveLength(4)
    expect(cardsInLane(state, 'bottom')).toHaveLength(4)
  })

  it('vergibt eindeutige IDs', () => {
    const state = createInitialState(8)

    expect(new Set(state.cards.map((c) => c.id)).size).toBe(state.cards.length)
  })
})
