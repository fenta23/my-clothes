import { INBOX_NAME, type ItemEvent } from '../data/types.ts'

/**
 * Formuliert einen Verlaufseintrag in einem Satz.
 *
 * Bewusst eine reine Funktion: die Historie ist der Kern des Wunsches "merke dir,
 * wann etwas gewandert ist" - ihre Formulierung soll pruefbar sein, ohne eine
 * Komponente zu rendern.
 */
export function describeEvent(event: ItemEvent): string {
  switch (event.kind) {
    case 'created':
      // Die mittlere Bahn heisst selbst schon "Neu" - "Neu hinzugefügt in Neu"
      // waere doppelt gemoppelt.
      return event.toName && event.toName !== INBOX_NAME
        ? `Neu hinzugefügt bei „${event.toName}“`
        : 'Neu hinzugefügt'

    case 'moved':
      return `${event.fromName ?? 'Unbekannt'} → ${event.toName ?? 'Unbekannt'}`

    case 'categoryChanged': {
      const from = event.fromName ?? 'ohne Kategorie'
      const to = event.toName ?? 'ohne Kategorie'

      return `Kategorie: ${from} → ${to}`
    }
  }
}

/** Zeitpunkt in deutscher Schreibweise, z. B. „31.08.2026, 21:40“. */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
