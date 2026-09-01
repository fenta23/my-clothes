import { useState } from 'react'

import { IconClose } from '../../shared/ui/icons.ts'
import styles from './UpdateBanner.module.css'

/**
 * Meldet eine bereitstehende neue Fassung.
 *
 * Bewusst ein Hinweis und kein selbsttaetiges Neuladen: die App koennte gerade
 * mitten im Erfassen eines Fotos sein, und ein Neuladen aus heiterem Himmel
 * verwirft diese Arbeit. Wann neu geladen wird, entscheidet der Mensch.
 *
 * Die Komponente kennt keinen Service Worker - sie bekommt alles als Eigenschaft
 * und ist deshalb ohne Browser-Umgebung pruefbar.
 */
export function UpdateBanner({
  onReload,
  onDismiss,
}: {
  onReload: () => void
  onDismiss: () => void
}) {
  const [reloading, setReloading] = useState(false)

  return (
    <div
      className={`glass glass--strong glass--pill ${styles.banner}`}
      role="status"
      aria-live="polite"
      data-testid="update-banner"
    >
      <span className={styles.text}>Neue Version verfügbar</span>

      <button
        type="button"
        className={styles.reload}
        disabled={reloading}
        data-testid="update-neu-laden"
        onClick={() => {
          setReloading(true)
          onReload()
        }}
      >
        {reloading ? 'Lädt…' : 'Neu laden'}
      </button>

      <button
        type="button"
        className={styles.dismiss}
        aria-label="Hinweis ausblenden"
        data-testid="update-ausblenden"
        onClick={onDismiss}
      >
        <IconClose className="icon icon--sm" aria-hidden="true" />
      </button>
    </div>
  )
}
