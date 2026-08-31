// Reine Rechnung, kein DOM noetig.
// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { FULL_MAX_EDGE, THUMB_MAX_EDGE, fitWithin } from './images.ts'

describe('fitWithin', () => {
  it('laesst ein bereits kleines Bild unveraendert', () => {
    expect(fitWithin({ width: 800, height: 600 }, FULL_MAX_EDGE)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('vergroessert nie', () => {
    // Ein kleines Foto wird durch Hochrechnen nicht besser, nur groesser.
    expect(fitWithin({ width: 50, height: 40 }, 1000)).toEqual({ width: 50, height: 40 })
  })

  it('begrenzt die Breite bei einem Querformat', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, FULL_MAX_EDGE)).toEqual({
      width: 1600,
      height: 1200,
    })
  })

  it('begrenzt die Hoehe bei einem Hochformat', () => {
    expect(fitWithin({ width: 3000, height: 4000 }, FULL_MAX_EDGE)).toEqual({
      width: 1200,
      height: 1600,
    })
  })

  it('behaelt das Seitenverhaeltnis bei', () => {
    const result = fitWithin({ width: 4032, height: 3024 }, THUMB_MAX_EDGE)

    expect(result.width / result.height).toBeCloseTo(4032 / 3024, 2)
  })

  it('haelt die lange Kante exakt auf dem Grenzwert', () => {
    const result = fitWithin({ width: 5000, height: 1000 }, THUMB_MAX_EDGE)

    expect(Math.max(result.width, result.height)).toBe(THUMB_MAX_EDGE)
  })

  it('rundet auf ganze Pixel', () => {
    const result = fitWithin({ width: 1001, height: 333 }, 100)

    expect(Number.isInteger(result.width)).toBe(true)
    expect(Number.isInteger(result.height)).toBe(true)
  })

  it('erzeugt bei extremen Seitenverhaeltnissen keine Kante mit null Pixeln', () => {
    // Ein Panorama darf nicht in einem Canvas der Hoehe 0 landen.
    const result = fitWithin({ width: 10000, height: 3 }, 100)

    expect(result.height).toBeGreaterThanOrEqual(1)
    expect(result.width).toBe(100)
  })

  it('kommt mit einem quadratischen Bild zurecht', () => {
    expect(fitWithin({ width: 2000, height: 2000 }, 400)).toEqual({
      width: 400,
      height: 400,
    })
  })

  it('wirft bei einer Groesse von null nicht', () => {
    expect(fitWithin({ width: 0, height: 0 }, 400)).toEqual({ width: 0, height: 0 })
  })

  it('liefert eine Kopie und veraendert die Eingabe nicht', () => {
    const input = { width: 100, height: 100 }

    expect(fitWithin(input, 400)).not.toBe(input)
  })
})
