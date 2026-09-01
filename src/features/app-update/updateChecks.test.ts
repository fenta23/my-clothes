import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_INTERVAL_MS,
  DEFAULT_TAP_GAP_MS,
  startUpdateChecks,
} from './updateChecks.ts'

type UpdateFn = () => Promise<unknown>

let update: ReturnType<typeof vi.fn<UpdateFn>>

/** Steuert, was document.visibilityState meldet. */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  update = vi.fn<UpdateFn>().mockResolvedValue(undefined)
  setVisibility('visible')
  vi.stubGlobal('navigator', { ...navigator, onLine: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('startUpdateChecks — Zeitgeber', () => {
  it('fragt nicht sofort, sondern erst nach dem ersten Abstand', () => {
    startUpdateChecks({ update })

    expect(update).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DEFAULT_INTERVAL_MS)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fragt wiederholt im gewaehlten Abstand', async () => {
    startUpdateChecks({ update }, { intervalMs: 1000 })

    // Zwischen den Durchlaeufen laufen lassen, damit die vorige Abfrage fertig ist.
    for (let i = 0; i < 3; i += 1) {
      vi.advanceTimersByTime(1000)
      await vi.advanceTimersByTimeAsync(0)
    }

    expect(update).toHaveBeenCalledTimes(3)
  })
})

/*
 * Diese Ausloeser sind der Kern: auf dem iPhone kam die Meldung nur nach einem
 * vollstaendigen Neustart der App, nicht aus dem Hintergrund. WebKit feuert bei
 * einer Standalone-App offenbar nicht verlaesslich `visibilitychange`, also darf
 * sich die App nicht auf ein einzelnes Signal verlassen.
 */
describe.each([
  ['visibilitychange', () => document.dispatchEvent(new Event('visibilitychange'))],
  ['pageshow', () => window.dispatchEvent(new Event('pageshow'))],
  ['focus', () => window.dispatchEvent(new Event('focus'))],
  ['online', () => window.dispatchEvent(new Event('online'))],
  ['pointerdown', () => document.dispatchEvent(new Event('pointerdown'))],
])('startUpdateChecks — Ausloeser %s', (_name, fire) => {
  it('loest eine Pruefung aus', () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    fire()

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('hoert nach dem Beenden auf', () => {
    const stop = startUpdateChecks({ update }, { intervalMs: 60_000 })

    stop()
    fire()

    expect(update).not.toHaveBeenCalled()
  })

  it('fragt ohne Netz nicht', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    fire()

    expect(update).not.toHaveBeenCalled()
  })
})

describe('startUpdateChecks — Bremsen', () => {
  it('startet aus einem Buendel gleichzeitiger Signale nur eine Abfrage', () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    // Beim Zurueckkehren feuern oft mehrere Ereignisse auf einmal.
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('verzoegert eine echte Rueckkehr nicht', async () => {
    startUpdateChecks({ update }, { intervalMs: 600_000 })

    window.dispatchEvent(new Event('pageshow'))
    await vi.advanceTimersByTimeAsync(0)

    // Kein Warten auf eine Sperrfrist: die naechste Rueckkehr fragt sofort wieder.
    window.dispatchEvent(new Event('pageshow'))

    expect(update).toHaveBeenCalledTimes(2)
  })

  it('macht aus haeufigem Antippen keine Anfrageflut', async () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    for (let i = 0; i < 20; i += 1) {
      document.dispatchEvent(new Event('pointerdown'))
      await vi.advanceTimersByTimeAsync(0)
    }

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fragt nach Ablauf der Antipp-Sperrfrist wieder', async () => {
    startUpdateChecks({ update }, { intervalMs: 600_000 })

    document.dispatchEvent(new Event('pointerdown'))
    await vi.advanceTimersByTimeAsync(0)
    expect(update).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(DEFAULT_TAP_GAP_MS + 1)
    document.dispatchEvent(new Event('pointerdown'))

    expect(update).toHaveBeenCalledTimes(2)
  })
})

describe('startUpdateChecks — Sonderfaelle', () => {
  it('fragt nicht, wenn die App in den Hintergrund geht', () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).not.toHaveBeenCalled()
  })

  it('laesst einen Fehlschlag die App nicht stoeren', async () => {
    const failing = vi.fn<UpdateFn>().mockRejectedValue(new Error('kein Netz'))
    startUpdateChecks({ update: failing }, { intervalMs: 1000 })

    // Ein abgelehntes Promise darf nicht als unbehandelt durchschlagen.
    await vi.advanceTimersByTimeAsync(1000)
    expect(failing).toHaveBeenCalled()

    // Und die naechste Pruefung muss trotzdem wieder laufen.
    await vi.advanceTimersByTimeAsync(1000)
    expect(failing).toHaveBeenCalledTimes(2)
  })

  it('hoert nach dem Beenden auch beim Zeitgeber auf', () => {
    const stop = startUpdateChecks({ update }, { intervalMs: 1000 })

    stop()
    vi.advanceTimersByTime(5000)

    expect(update).not.toHaveBeenCalled()
  })
})
