// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

import { createStore } from './createStore.ts'
import { shallowArrayEqual } from './useStore.ts'

describe('createStore', () => {
  it('liefert den Anfangszustand', () => {
    expect(createStore({ zahl: 1 }).getState()).toEqual({ zahl: 1 })
  })

  it('ersetzt den Zustand', () => {
    const store = createStore({ zahl: 1 })

    store.setState((s) => ({ zahl: s.zahl + 1 }))

    expect(store.getState()).toEqual({ zahl: 2 })
  })

  it('benachrichtigt Abonnenten', () => {
    const store = createStore({ zahl: 1 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState((s) => ({ zahl: s.zahl + 1 }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('weckt niemanden, wenn sich die Referenz nicht aendert', () => {
    const store = createStore({ zahl: 1 })
    const listener = vi.fn()
    store.subscribe(listener)

    // Derselbe Zustand zurueckgegeben: kein Grund fuer ein erneutes Rendern.
    store.setState((s) => s)

    expect(listener).not.toHaveBeenCalled()
  })

  it('benachrichtigt mehrere Abonnenten', () => {
    const store = createStore({ zahl: 1 })
    const a = vi.fn()
    const b = vi.fn()
    store.subscribe(a)
    store.subscribe(b)

    store.setState(() => ({ zahl: 9 }))

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('beendet ein Abonnement', () => {
    const store = createStore({ zahl: 1 })
    const listener = vi.fn()
    const stop = store.subscribe(listener)

    stop()
    store.setState(() => ({ zahl: 2 }))

    expect(listener).not.toHaveBeenCalled()
  })

  it('sieht im Aktualisierer immer den neuesten Zustand', () => {
    const store = createStore({ zahl: 0 })

    store.setState((s) => ({ zahl: s.zahl + 1 }))
    store.setState((s) => ({ zahl: s.zahl + 1 }))

    expect(store.getState().zahl).toBe(2)
  })
})

describe('shallowArrayEqual', () => {
  it('erkennt dieselbe Referenz', () => {
    const list = [1, 2]

    expect(shallowArrayEqual(list, list)).toBe(true)
  })

  it('erkennt gleiche Elemente in neuen Listen', () => {
    const a = { id: 1 }

    expect(shallowArrayEqual([a], [a])).toBe(true)
  })

  it('erkennt unterschiedliche Laengen', () => {
    expect(shallowArrayEqual([1], [1, 2])).toBe(false)
  })

  it('erkennt ausgetauschte Elemente', () => {
    expect(shallowArrayEqual([{ id: 1 }], [{ id: 1 }])).toBe(false)
  })

  it('behandelt leere Listen als gleich', () => {
    expect(shallowArrayEqual([], [])).toBe(true)
  })
})
