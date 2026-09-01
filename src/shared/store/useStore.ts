import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { Store } from './createStore.ts'

/**
 * Liest einen Ausschnitt aus einem Store und rendert nur bei dessen Aenderung neu.
 *
 * Der Zwischenspeicher ist keine Optimierung, sondern notwendig: React verlangt von
 * `useSyncExternalStore`, dass zwei Aufrufe ohne Aenderung dieselbe Referenz liefern.
 * Ein Selektor wie `s => s.items.filter(…)` erzeugt jedes Mal ein neues Array - ohne
 * Vergleich liefe das Rendern endlos.
 */
export function useStoreSelector<T, S>(
  store: Store<T>,
  selector: (state: T) => S,
  isEqual: (a: S, b: S) => boolean = Object.is,
): S {
  const cache = useRef<{ value: S } | null>(null)

  const getSnapshot = useCallback(() => {
    const next = selector(store.getState())

    if (cache.current && isEqual(cache.current.value, next)) return cache.current.value

    cache.current = { value: next }

    return next
  }, [store, selector, isEqual])

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

/** Vergleicht Listen anhand ihrer Elemente - fuer Selektoren, die filtern oder abbilden. */
export function shallowArrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false

  return a.every((item, index) => Object.is(item, b[index]))
}
