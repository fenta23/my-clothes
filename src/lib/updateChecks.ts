/**
 * Regelmaessig nach einer neuen Fassung suchen.
 *
 * Warum das noetig ist: der Browser prueft den Service Worker im Wesentlichen nur
 * beim Navigieren. Eine Home-Screen-App navigiert aber nie - sie wird geoeffnet und
 * bleibt tagelang im Hintergrund liegen. Ohne aktives Nachfragen erfaehrt sie von
 * einer neuen Fassung schlicht nichts.
 *
 * Der wichtigste Ausloeser ist deshalb nicht der Zeitgeber, sondern die Rueckkehr in
 * den Vordergrund: genau dann schaut ein Kind auf die App, und genau dann soll die
 * Frage nach einer neuen Fassung gestellt werden.
 */

/** Nur der Teil einer ServiceWorkerRegistration, den wir brauchen - so ist es pruefbar. */
export interface UpdateCheckTarget {
  update: () => Promise<unknown>
}

export interface UpdateCheckOptions {
  /** Abstand zwischen zwei Pruefungen im Hintergrund. */
  intervalMs?: number
}

/** Eine Stunde: haeufiger bringt nichts, seltener verpasst einen ganzen Tag. */
export const DEFAULT_INTERVAL_MS = 60 * 60 * 1000

/**
 * Startet die Suche und liefert eine Funktion zum Beenden zurueck.
 *
 * Ohne Netz wird nicht gefragt - ein fehlgeschlagener Abruf braeuchte nur Strom und
 * wuerde die Konsole mit Fehlern fuellen.
 */
export function startUpdateChecks(
  target: UpdateCheckTarget,
  options: UpdateCheckOptions = {},
): () => void {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS

  const check = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    // Ein Fehlschlag ist kein Grund, die App zu stoeren - beim naechsten Mal wieder.
    void Promise.resolve(target.update()).catch(() => undefined)
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') check()
  }

  const timer = setInterval(check, intervalMs)
  document.addEventListener('visibilitychange', onVisible)
  // Auch beim Zurueckkehren aus dem Seiten-Cache, das feuert kein visibilitychange.
  window.addEventListener('focus', check)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', check)
  }
}
