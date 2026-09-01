// @vitest-environment node

import { describe, expect, it } from 'vitest'

import type { ItemEvent } from '../../entities/event/types.ts'
import { describeEvent } from './eventText.ts'

const event = (patch: Partial<ItemEvent>): ItemEvent => ({
  id: 'e1',
  itemId: 'i1',
  timestamp: 1_700_000_000_000,
  kind: 'moved',
  fromName: null,
  toName: null,
  ...patch,
})

describe('describeEvent', () => {
  it('beschreibt einen Zugang mit Zielbahn', () => {
    expect(describeEvent(event({ kind: 'created', toName: 'Bei Mama' }))).toBe(
      'Neu hinzugefügt bei „Bei Mama“',
    )
  })

  it('beschreibt einen Zugang auch ohne Zielangabe', () => {
    expect(describeEvent(event({ kind: 'created' }))).toBe('Neu hinzugefügt')
  })

  it('nennt die mittlere Bahn nicht doppelt', () => {
    // Die Bahn heisst selbst "Neu" - "Neu hinzugefügt in Neu" liest sich falsch.
    expect(describeEvent(event({ kind: 'created', toName: 'Neu' }))).toBe(
      'Neu hinzugefügt',
    )
  })

  it('beschreibt einen Wechsel als Pfeil zwischen beiden Namen', () => {
    expect(
      describeEvent(event({ kind: 'moved', fromName: 'Neu', toName: 'Bei Papa' })),
    ).toBe('Neu → Bei Papa')
  })

  it('nennt eine fehlende Kategorie ausdruecklich', () => {
    expect(
      describeEvent(event({ kind: 'categoryChanged', fromName: null, toName: 'Hose' })),
    ).toBe('Kategorie: ohne Kategorie → Hose')
  })

  it('beschreibt auch das Entfernen einer Kategorie', () => {
    expect(
      describeEvent(event({ kind: 'categoryChanged', fromName: 'Rock', toName: null })),
    ).toBe('Kategorie: Rock → ohne Kategorie')
  })
})
