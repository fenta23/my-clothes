import type { ReactNode } from 'react'

import styles from './Sheet.module.css'

/**
 * Der Rahmen aller von unten einfahrenden Blaetter.
 *
 * Beim Aufteilen in Features fiel auf, dass Erfassen, Detailansicht und
 * Einstellungen denselben Aufbau dreifach enthielten - inklusive der Feinheit, dass
 * ein Tippen im Blatt selbst nicht schliessen darf. Solche Regeln gehoeren an eine
 * Stelle, sonst weichen sie mit der Zeit voneinander ab.
 */
export function Sheet({
  label,
  testId,
  onClose,
  children,
}: {
  /** Beschriftung fuer Screenreader. */
  label: string
  testId: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`glass glass--strong ${styles.sheet}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
        // Ohne das schliesst jeder Griff ins Blatt selbst das Blatt.
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.grabber} />
        {children}
      </div>
    </div>
  )
}
