import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { startUpdateChecks } from './updateChecks.ts'

export interface AppUpdate {
  /** Eine neue Fassung liegt bereit und wartet darauf, uebernommen zu werden. */
  needRefresh: boolean
  /** Uebernimmt die neue Fassung und laedt die App neu. */
  reload: () => void
  /** Blendet den Hinweis aus; beim naechsten Start kommt er wieder. */
  dismiss: () => void
}

/**
 * Verbindet den Service Worker mit der Oberflaeche.
 *
 * Bewusst duenn gehalten: alles Pruefbare liegt in `startUpdateChecks` und im
 * Banner selbst, hier bleibt nur die Verdrahtung mit dem virtuellen Modul des
 * PWA-Plugins.
 */
export function useAppUpdate(): AppUpdate {
  const stopChecks = useRef<(() => void) | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) stopChecks.current = startUpdateChecks(registration)
    },
    onRegisterError(error) {
      // Kein Service Worker heisst: kein Offline-Betrieb und keine
      // Update-Meldung. Die App funktioniert weiter, also nur protokollieren.
      console.error('[Update] Service Worker nicht registriert', error)
    },
  })

  useEffect(() => () => stopChecks.current?.(), [])

  return {
    needRefresh,
    reload: () => void updateServiceWorker(true),
    dismiss: () => setNeedRefresh(false),
  }
}
