/**
 * Ein sehr kleiner Speicher fuer gemeinsamen Zustand.
 *
 * Warum nicht weiter ein React-Context: der bisherige Kleiderschrank-Context hielt
 * Haushalte, Kategorien, Kleidung, Bilder, Verlauf und Sicherung in einem Objekt.
 * Jede Aenderung erzeugte einen neuen Wert - und weil jede Karte ueber
 * `useThumbnail` an diesem Context hing, wurde beim Hinzufuegen eines einzigen
 * Fotos die gesamte Oberflaeche neu gerendert. Bei zehn Teilen faellt das nicht auf,
 * bei zweihundert schon.
 *
 * Hier abonnieren Komponenten stattdessen gezielt einen Ausschnitt. Wer nur die
 * Kategorien liest, merkt von einem neuen Foto nichts.
 */

export interface Store<T> {
  getState: () => T
  /** Ersetzt den Zustand und benachrichtigt alle Abonnenten. */
  setState: (update: (current: T) => T) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,

    setState: (update) => {
      const next = update(state)
      // Gleicher Zustand, gleiche Referenz: kein Grund, irgendwen zu wecken.
      if (Object.is(next, state)) return

      state = next
      for (const listener of listeners) listener()
    },

    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
