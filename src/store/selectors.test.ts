// @vitest-environment node

import { describe, expect, it } from 'vitest'

import type { ClothingItem } from '../entities/clothing/types.ts'
import type { Household } from '../entities/household/types.ts'
import type { Outfit } from '../entities/outfit/types.ts'
import {
  outfitStatusEqual,
  selectOutfitItems,
  selectOutfitStatus,
  type OutfitStatus,
} from './selectors.ts'
import type { WardrobeState } from './wardrobeStore.ts'

const mama: Household = {
  id: 'h1',
  name: 'Bei Mama',
  position: 0,
  createdAt: 1000,
  updatedAt: 1000,
}
const papa: Household = {
  id: 'h2',
  name: 'Bei Papa',
  position: 1,
  createdAt: 1000,
  updatedAt: 1000,
}

function stueck(id: string, householdId: string | null): ClothingItem {
  return { id, title: id, categoryId: null, householdId, createdAt: 1000, updatedAt: 1000 }
}

function zustand(items: ClothingItem[], outfits: Outfit[]): WardrobeState {
  return {
    status: 'bereit',
    error: null,
    households: [mama, papa],
    categories: [],
    items,
    outfits,
  }
}

const outfit = (itemIds: string[]): Outfit => ({
  id: 'o1',
  name: 'Schultag',
  itemIds,
  createdAt: 1000,
  updatedAt: 1000,
})

describe('selectOutfitItems', () => {
  it('haelt die Reihenfolge des Outfits, nicht die des Schranks', () => {
    const state = zustand(
      [stueck('a', null), stueck('b', null)],
      [outfit(['b', 'a'])],
    )

    expect(selectOutfitItems('o1')(state).map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('uebergeht ein Stueck, das es nicht mehr gibt', () => {
    // Darf nicht vorkommen - `deleteItem` raeumt mit ab - soll die Anzeige aber
    // auch nicht zerlegen, falls doch.
    const state = zustand([stueck('a', null)], [outfit(['a', 'weg'])])

    expect(selectOutfitItems('o1')(state).map((i) => i.id)).toEqual(['a'])
  })

  it('gibt fuer ein unbekanntes Outfit immer dieselbe leere Liste zurueck', () => {
    // Eine frische leere Liste je Aufruf waere fuer useSyncExternalStore eine
    // Aenderung - und damit eine Endlosschleife.
    const state = zustand([], [])

    expect(selectOutfitItems('gibtsnicht')(state)).toBe(selectOutfitItems(null)(state))
  })
})

describe('selectOutfitStatus', () => {
  it('meldet ein vollstaendiges Outfit bei einem Haushalt', () => {
    const state = zustand([stueck('a', 'h1'), stueck('b', 'h1')], [outfit(['a', 'b'])])

    const status = selectOutfitStatus('o1')(state)

    expect(status.gesamt).toBe(2)
    expect(status.komplettBei).toBe('h1')
    expect(status.jeHaushalt).toEqual([{ ref: 'h1', name: 'Bei Mama', anzahl: 2 }])
  })

  it('zaehlt verteilte Teile je Haushalt in der Reihenfolge der Bahnen', () => {
    const state = zustand(
      [stueck('a', 'h2'), stueck('b', 'h1'), stueck('c', 'h2')],
      [outfit(['a', 'b', 'c'])],
    )

    const status = selectOutfitStatus('o1')(state)

    expect(status.komplettBei).toBeNull()
    expect(status.jeHaushalt).toEqual([
      { ref: 'h1', name: 'Bei Mama', anzahl: 1 },
      { ref: 'h2', name: 'Bei Papa', anzahl: 2 },
    ])
  })

  it('nennt die mittlere Bahn zuletzt und gilt dort nicht als vollstaendig', () => {
    // "Alles in Neu" heisst gerade nicht "liegt bei jemandem".
    const state = zustand([stueck('a', null)], [outfit(['a'])])

    const status = selectOutfitStatus('o1')(state)

    expect(status.jeHaushalt).toEqual([{ ref: null, name: 'Neu', anzahl: 1 }])
    expect(status.komplettBei).toBeNull()
  })

  it('kommt mit einem leeren Outfit zurecht', () => {
    const status = selectOutfitStatus('o1')(zustand([], [outfit([])]))

    expect(status).toEqual({ gesamt: 0, jeHaushalt: [], komplettBei: null })
  })
})

describe('outfitStatusEqual', () => {
  const basis: OutfitStatus = {
    gesamt: 1,
    jeHaushalt: [{ ref: 'h1', name: 'Bei Mama', anzahl: 1 }],
    komplettBei: 'h1',
  }

  it('haelt zwei gleich gebildete Staende fuer gleich', () => {
    expect(outfitStatusEqual(basis, structuredClone(basis))).toBe(true)
  })

  it('bemerkt einen umbenannten Haushalt', () => {
    const umbenannt = structuredClone(basis)
    umbenannt.jeHaushalt[0]!.name = 'Bei Oma'

    expect(outfitStatusEqual(basis, umbenannt)).toBe(false)
  })

  it('bemerkt ein gewandertes Teil', () => {
    expect(
      outfitStatusEqual(basis, {
        gesamt: 1,
        jeHaushalt: [{ ref: 'h2', name: 'Bei Papa', anzahl: 1 }],
        komplettBei: 'h2',
      }),
    ).toBe(false)
  })
})
