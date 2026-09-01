import { CONTACT_EMAIL, CONTROLLER_NAME, REPOSITORY_URL, isControllerConfigured } from './controller.ts'
import styles from './legal.module.css'

/**
 * Impressum.
 *
 * Bewusst knapp: ein privates, nicht-kommerzielles Projekt ohne Entgelt faellt nicht
 * unter die Anbieterkennzeichnung fuer geschaeftsmaessige Telemedien. Name und eine
 * unmittelbare Kontaktmoeglichkeit stehen trotzdem da - wer eine oeffentlich
 * erreichbare Seite betreibt, sollte ansprechbar sein.
 */
export function ImprintPanel() {
  return (
    <div className={styles.panel} data-testid="impressum-panel">
      <p className={styles.lead}>Privates, nicht-kommerzielles Open-Source-Projekt.</p>

      {!isControllerConfigured() && (
        <p className={styles.warning} data-testid="impressum-warnung">
          Der Verantwortliche ist nicht hinterlegt. Beim Bauen muss
          <code> VITE_CONTROLLER_NAME </code> gesetzt sein.
        </p>
      )}

      <div>
        <p className={styles.heading}>Verantwortlich</p>
        <p data-testid="impressum-verantwortlich">{CONTROLLER_NAME}</p>
      </div>

      <div>
        <p className={styles.heading}>Kontakt</p>
        <p>
          <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>

      <p className={styles.note}>
        Bei Fragen oder Problemen gern auch ein{' '}
        <a
          className={styles.link}
          href={`${REPOSITORY_URL}/issues`}
          target="_blank"
          rel="noopener"
        >
          GitHub-Issue
        </a>{' '}
        eröffnen.
      </p>

      <p className={styles.note}>
        Hinweis: Diese App erhebt keine personenbezogenen Daten, betreibt keine Werbung
        und kein Tracking. Alle Fotos bleiben auf dem Gerät. Einzelheiten stehen in der
        Datenschutzerklärung.
      </p>
    </div>
  )
}
