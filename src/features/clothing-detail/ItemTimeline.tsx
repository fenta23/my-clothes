import type { ItemEvent } from '../../entities/event/types.ts'
import { formatTimestamp } from '../../shared/lib/datetime.ts'
import { describeEvent } from './eventText.ts'
import styles from './ItemTimeline.module.css'

/**
 * Der Verlauf eines Kleidungsstuecks, neueste Aenderung zuerst - eingeklappt.
 *
 * Der Verlauf ist Nebeninformation: interessant, wenn man ihn sucht, aber er soll
 * nicht die halbe Detailansicht fuellen und das Loeschen aus dem Blick schieben. Die
 * Anzahl steht in der Ueberschrift, damit man vor dem Aufklappen weiss, ob sich das
 * lohnt.
 *
 * Umgesetzt mit `details`/`summary` statt eigenem Zustand: das bringt Bedienung per
 * Tastatur, Ansage durch Screenreader und die Suche im Browser von Haus aus mit.
 */
export function ItemTimeline({ events }: { events: readonly ItemEvent[] }) {
  return (
    <details className={styles.details} data-testid="verlauf-details">
      <summary className={styles.summary} data-testid="verlauf-aufklappen">
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
        Verlauf
        <span className={styles.count}>
          {events.length === 1 ? '1 Eintrag' : `${events.length} Einträge`}
        </span>
      </summary>

      <div className={styles.body}>
        <div className={styles.timeline} data-testid="verlauf">
          {events.map((event) => (
            <div key={event.id} className={styles.entry} data-testid="verlauf-eintrag">
              <span className={styles.text} data-testid="verlauf-text">
                {describeEvent(event)}
              </span>
              <span className={styles.time} data-testid="verlauf-zeit">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
