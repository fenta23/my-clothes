import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_INTERVAL_MS, startUpdateChecks } from './updateChecks.ts'

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

describe('startUpdateChecks', () => {
  it('fragt nicht sofort, sondern erst nach dem ersten Abstand', () => {
    startUpdateChecks({ update })

    expect(update).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DEFAULT_INTERVAL_MS)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fragt wiederholt im gewaehlten Abstand', () => {
    startUpdateChecks({ update }, { intervalMs: 1000 })

    vi.advanceTimersByTime(3000)

    expect(update).toHaveBeenCalledTimes(3)
  })

  it('fragt beim Zurueckkehren in den Vordergrund', () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    // Der wichtigste Ausloeser: eine Home-Screen-App navigiert nie, sie wird
    // nur wieder hervorgeholt.
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fragt nicht, wenn die App in den Hintergrund geht', () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).not.toHaveBeenCalled()
  })

  it('fragt auch beim Fokus des Fensters', () => {
    startUpdateChecks({ update }, { intervalMs: 60_000 })

    window.dispatchEvent(new Event('focus'))

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fragt ohne Netz gar nicht', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    startUpdateChecks({ update }, { intervalMs: 1000 })

    vi.advanceTimersByTime(5000)
    window.dispatchEvent(new Event('focus'))

    expect(update).not.toHaveBeenCalled()
  })

  it('laesst einen Fehlschlag die App nicht stoeren', () => {
    const failing = vi.fn<UpdateFn>().mockRejectedValue(new Error('kein Netz'))
    startUpdateChecks({ update: failing }, { intervalMs: 1000 })

    // Ein abgelehntes Promise darf nicht als unbehandelt durchschlagen.
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    expect(failing).toHaveBeenCalled()
  })

  it('hoert nach dem Beenden vollstaendig auf', () => {
    const stop = startUpdateChecks({ update }, { intervalMs: 1000 })

    stop()

    vi.advanceTimersByTime(5000)
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))

    expect(update).not.toHaveBeenCalled()
  })
})
