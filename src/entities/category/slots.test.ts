// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES } from './defaults.ts'
import { ALL_SLOTS, SLOT_LABELS, slotFor } from './slots.ts'
import type { Category } from './types.ts'

function kategorie(patch: Partial<Category>): Category {
  return {
    id: 'k1',
    name: 'Irgendwas',
    emoji: '🏷️',
    colorHex: '#000000',
    sortOrder: 0,
    createdAt: 1000,
    updatedAt: 1000,
    ...patch,
  }
}

describe('slotFor', () => {
  it('nimmt die Angabe des Nutzers, auch gegen den Namen', () => {
    // Wer "Hose" zur Kopfbedeckung erklaert, hat seine Gruende - die Angabe gewinnt.
    expect(slotFor(kategorie({ name: 'Hose', slot: 'kopf' }))).toBe('kopf')
  })

  it('erkennt die Startkategorien am Namen, wenn nichts eingestellt ist', () => {
    // Der Fall auf dem Geraet: die Kategorien stammen aus der Zeit vor den Outfits.
    expect(slotFor(kategorie({ name: 'Hose' }))).toBe('unten')
    expect(slotFor(kategorie({ name: 'T-Shirt' }))).toBe('oben')
    expect(slotFor(kategorie({ name: 'Kleid' }))).toBe('ganz')
    expect(slotFor(kategorie({ name: 'Schuhe' }))).toBe('fuesse')
  })

  it('faellt bei unbekanntem Namen auf "sonstiges" zurueck', () => {
    expect(slotFor(kategorie({ name: 'Faschingskostüm' }))).toBe('sonstiges')
  })

  it('deckt jede Startkategorie ab', () => {
    for (const seed of DEFAULT_CATEGORIES) {
      expect(slotFor(kategorie({ name: seed.name })), seed.name).toBe(seed.slot)
    }
  })
})

describe('Trageorte', () => {
  it('hat fuer jeden Trageort eine Beschriftung', () => {
    for (const slot of ALL_SLOTS) expect(SLOT_LABELS[slot]).toBeTruthy()
  })

  it('bietet "sonstiges" zuletzt an', () => {
    expect(ALL_SLOTS.at(-1)).toBe('sonstiges')
  })
})
