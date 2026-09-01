/**
 * Regelmaessig nach einer neuen Fassung suchen.
 *
 * Warum das noetig ist: der Browser prueft den Service Worker im Wesentlichen nur
 * beim Navigieren. Eine Home-Screen-App navigiert aber nie - sie wird geoeffnet und
 * bleibt tagelang im Hintergrund liegen. Ohne aktives Nachfragen erfaehrt sie von
 * einer neuen Fassung schlicht nichts.
 *
 * Warum gleich fuenf Ausloeser statt nur `visibilitychange`: auf einem echten iPhone
 * kam die Meldung nur, wenn die App vorher vollstaendig beendet war - aus dem
 * Hintergrund heraus nicht. Der Mechanismus selbst ist nachweislich in Ordnung
 * (`e2e/update.spec.ts`), also feuert WebKit bei einer Standalone-App auf dem
 * Weg zurueck in den Vordergrund nicht verlaesslich `visibilitychange`.
 *
 * Deshalb wird jedes plausible Signal genommen - und `pointerdown` als letzte
 * Sicherung: wer die App bedient, ist ganz sicher da. Eine Sperrfrist verhindert,
 * dass daraus bei jedem Antippen eine Anfrage wird.
 */

/** Nur der Teil einer ServiceWorkerRegistration, den wir brauchen - so ist es pruefbar. */
export interface UpdateCheckTarget {
  update: () => Promise<unknown>
}

export interface UpdateCheckOptions {
  /** Abstand zwischen zwei Pruefungen im Hintergrund. */
  intervalMs?: number
  /** Mindestabstand zwischen zwei Pruefungen durch Antippen. */
  tapGapMs?: number
}

/** Eine Stunde: haeufiger bringt nichts, seltener verpasst einen ganzen Tag. */
export const DEFAULT_INTERVAL_MS = 60 * 60 * 1000

/** Sperrfrist fuer das Antippen, damit daraus keine Anfrageflut wird. */
export const DEFAULT_TAP_GAP_MS = 60 * 1000

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
  const tapGapMs = options.tapGapMs ?? DEFAULT_TAP_GAP_MS

  /*
   * Zwei verschiedene Bremsen, weil die Signale verschieden sind.
   *
   * Lebenszyklus-Ereignisse feuern beim Zurueckkehren gerne im Buendel - dagegen
   * hilft, eine laufende Abfrage nicht doppelt zu starten. Eine Sperrfrist in
   * Sekunden waere hier falsch: sie wuerde eine echte Rueckkehr verzoegern, ohne
   * etwas zu sparen.
   *
   * Antippen dagegen passiert dutzendfach in der Minute - dort braucht es eine
   * echte Sperrfrist.
   */
  let inFlight = false
  let lastTapCheck = 0

  const check = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (inFlight) return

    inFlight = true

    // Ein Fehlschlag ist kein Grund, die App zu stoeren - beim naechsten Mal wieder.
    void Promise.resolve(target.update())
      .catch(() => undefined)
      .finally(() => {
        inFlight = false
      })
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') check()
  }

  const onSignal = () => check()

  const onTap = () => {
    const now = Date.now()
    if (now - lastTapCheck < tapGapMs) return

    lastTapCheck = now
    check()
  }

  const timer = setInterval(check, intervalMs)

  document.addEventListener('visibilitychange', onVisibilityChange)
  // Rueckkehr aus dem Seiten-Cache. Genau hier feuert kein visibilitychange.
  window.addEventListener('pageshow', onSignal)
  window.addEventListener('focus', onSignal)
  // Wieder online zu sein ist ein guter Moment zum Nachfragen.
  window.addEventListener('online', onSignal)
  // Letzte Sicherung: wer bedient, ist da. Die Sperrfrist begrenzt das.
  document.addEventListener('pointerdown', onTap, { passive: true })

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pageshow', onSignal)
    window.removeEventListener('focus', onSignal)
    window.removeEventListener('online', onSignal)
    document.removeEventListener('pointerdown', onTap)
  }
}
