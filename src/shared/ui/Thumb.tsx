import { IconClothing } from './icons.ts'
import styles from './Thumb.module.css'

/**
 * Ein Vorschaubild mit Platzhalter.
 *
 * Nimmt bewusst nur einfache Werte statt eines Kleidungsstuecks: `shared` darf die
 * Fachlichkeit nicht kennen. Dafuer koennen die Karten im Schrank und die Figur im
 * Outfit dieselbe Darstellung benutzen, ohne dass ein Feature das andere kennt.
 *
 * `loading="lazy"` samt fester Groesse ist der Grund, warum ein voller Schrank nicht
 * alle Bilder auf einmal dekodiert - die Angaben gehoeren deshalb hierher und nicht
 * an jede Aufrufstelle.
 */
export function Thumb({
  url,
  emoji,
  size,
  className,
  placeholderClassName,
  eager = false,
}: {
  url: string | null
  /** Symbol der Kategorie, wenn es kein Foto gibt. Angabe des Nutzers. */
  emoji?: string | undefined
  /** Anzeigegroesse in CSS-Pixeln - der Browser kennt den Platz vor dem Bild. */
  size: number
  className?: string
  placeholderClassName?: string
  /** Fuer Bilder, die sicher sichtbar sind - etwa am ziehenden Finger. */
  eager?: boolean
}) {
  if (!url) {
    return (
      <span
        className={`${styles.placeholder} ${placeholderClassName ?? ''}`}
        aria-hidden="true"
      >
        {emoji || <IconClothing className="icon icon--lg" />}
      </span>
    )
  }

  return (
    <img
      className={`${styles.photo} ${className ?? ''}`}
      src={url}
      alt=""
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      width={size}
      height={size}
    />
  )
}
