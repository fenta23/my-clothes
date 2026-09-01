import type { ReactNode } from 'react'

import styles from './Drawer.module.css'

/**
 * Seitenleiste, die von rechts einfaehrt.
 *
 * Anders als die Blaetter von unten fuellt sie die volle Hoehe - sie traegt
 * Nebenschauplaetze wie Einstellungen und Rechtliches, die man liest statt
 * nebenbei zu bedienen.
 *
 * `onBack` erzeugt einen Zurueck-Pfeil: die Leiste navigiert in sich selbst, statt
 * Blaetter uebereinander zu stapeln. Auf einem Telefon ist gestapeltes Schliessen
 * schwer zu treffen und noch schwerer zu verstehen.
 */
export function Drawer({
  title,
  testId,
  onClose,
  onBack,
  children,
}: {
  title: string
  testId: string
  onClose: () => void
  onBack?: () => void
  children: ReactNode
}) {
  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`glass glass--strong ${styles.drawer}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          {onBack && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Zurück"
              data-testid="menue-zurueck"
              onClick={onBack}
            >
              ‹
            </button>
          )}

          <h2 className={styles.title}>{title}</h2>

          <button
            type="button"
            className={styles.iconButton}
            aria-label="Schließen"
            data-testid="menue-schliessen"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
