// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { formatTimestamp } from './datetime.ts'

describe('formatTimestamp', () => {
  it('schreibt Datum und Uhrzeit in deutscher Form', () => {
    const text = formatTimestamp(new Date('2026-08-31T21:40:00').getTime())

    expect(text).toContain('2026')
    expect(text).toContain('21:40')
  })

  it('schreibt das Datum in deutscher Reihenfolge Tag.Monat.Jahr', () => {
    expect(formatTimestamp(new Date('2026-09-01T10:00:00').getTime())).toBe(
      '01.09.2026, 10:00',
    )
  })

  it('fuellt einstellige Tage und Stunden auf', () => {
    // Wichtig fuer die Zeitleiste: sonst springen die Spalten.
    expect(formatTimestamp(new Date('2026-01-05T09:07:00').getTime())).toBe(
      '05.01.2026, 09:07',
    )
  })
})
