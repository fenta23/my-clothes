import type { ItemEvent } from '../../entities/event/types.ts'
import { formatTimestamp } from '../../shared/lib/datetime.ts'
import { describeEvent } from './eventText.ts'
import styles from './ItemTimeline.module.css'

/**
 * Der Verlauf eines Kleidungsstuecks, neueste Aenderung zuerst.
 *
 * Ohne diese Ansicht waere der ausdrueckliche Wunsch "merke dir, wann etwas
 * gewandert ist" nur halb erfuellt: die Daten lagen von Anfang an vor, nur sehen
 * konnte man sie nicht.
 */
export function ItemTimeline({ events }: { events: readonly ItemEvent[] }) {
  return (
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
  )
}
