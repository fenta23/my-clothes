import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { useStoreSelector } from '../shared/store/useStore.ts'
import { createWardrobeStore, type WardrobeState, type WardrobeStore } from './wardrobeStore.ts'

/*
 * Der Context transportiert nur die Store-Referenz, nicht den Zustand.
 *
 * Das ist der entscheidende Unterschied zum frueheren Aufbau: die Referenz aendert
 * sich nie, also loest der Context selbst nie ein erneutes Rendern aus. Wer welche
 * Daten braucht, entscheidet jede Komponente ueber ihren Selektor.
 */
const StoreContext = createContext<WardrobeStore | null>(null)

export function StoreProvider({
  children,
  dbName,
  /** Nur im Test: ein fertig bestueckter Store statt eines frisch geoeffneten. */
  store: injected,
}: {
  children: ReactNode
  dbName?: string
  store?: WardrobeStore
}) {
  const [store] = useState(() => injected ?? createWardrobeStore())
  const opened = useRef(false)

  useEffect(() => {
    if (injected || opened.current) return

    opened.current = true
    void store.open(dbName)
  }, [store, dbName, injected])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useWardrobeStore(): WardrobeStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useWardrobeStore ausserhalb von StoreProvider verwendet')

  return store
}

/** Liest einen Ausschnitt des Zustands und rendert nur bei dessen Aenderung neu. */
export function useWardrobe<S>(
  selector: (state: WardrobeState) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  return useStoreSelector(useWardrobeStore(), selector, isEqual)
}
