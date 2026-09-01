// @vitest-environment node

import { describe, expect, it } from 'vitest'

import type { OutfitStatus } from '../../store/selectors.ts'
import { outfitStatusText } from './outfitStatusText.ts'

const status = (patch: Partial<OutfitStatus>): OutfitStatus => ({
  gesamt: 0,
  jeHaushalt: [],
  komplettBei: null,
  ...patch,
})

describe('outfitStatusText', () => {
  it('sagt beim leeren Outfit, dass noch nichts gewaehlt ist', () => {
    expect(outfitStatusText(status({}))).toBe('Noch keine Teile ausgewählt')
  })

  it('meldet ein vollstaendiges Outfit mit dem Namen des Haushalts', () => {
    expect(
      outfitStatusText(
        status({
          gesamt: 3,
          jeHaushalt: [{ ref: 'h1', name: 'Bei Mama', anzahl: 3 }],
          komplettBei: 'h1',
        }),
      ),
    ).toBe('Komplett bei Bei Mama')
  })

  it('zaehlt auf, wenn die Teile verteilt sind', () => {
    // Der Fall, fuer den es die Outfits gibt.
    expect(
      outfitStatusText(
        status({
          gesamt: 4,
          jeHaushalt: [
            { ref: 'h1', name: 'Bei Mama', anzahl: 3 },
            { ref: 'h2', name: 'Bei Papa', anzahl: 1 },
          ],
        }),
      ),
    ).toBe('3 bei Bei Mama · 1 bei Bei Papa')
  })

  it('unterscheidet Ein- und Mehrzahl in der mittleren Bahn', () => {
    expect(
      outfitStatusText(
        status({ gesamt: 1, jeHaushalt: [{ ref: null, name: 'Neu', anzahl: 1 }] }),
      ),
    ).toBe('1 Teil ist noch nicht zugeordnet')

    expect(
      outfitStatusText(
        status({ gesamt: 2, jeHaushalt: [{ ref: null, name: 'Neu', anzahl: 2 }] }),
      ),
    ).toBe('2 Teile sind noch nicht zugeordnet')
  })
})
