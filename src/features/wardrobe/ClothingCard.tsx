import { useDraggable } from '@dnd-kit/core'

import type { Category } from '../../entities/category/types.ts'
import type { ClothingItem } from '../../entities/clothing/types.ts'
import { IconClothing } from '../../shared/ui/icons.ts'
import styles from './ClothingCard.module.css'
import { useThumbnail } from './useThumbnail.ts'

/**
 * Anzeigegroesse der Vorschau in CSS-Pixeln.
 *
 * Als width/height am Bild gesetzt, damit der Browser den Platz kennt, bevor die
 * Datei da ist - sonst springt das Layout beim Nachladen, und `loading="lazy"`
 * koennte gar nicht entscheiden, was ausserhalb des Sichtfelds liegt.
 */
const THUMB_DISPLAY_PX = 108

export function ClothingCard({
  item,
  category,
  dimmed,
  onOpen,
}: {
  item: ClothingItem
  category: Category | undefined
  /** Vom Filter ausgeblendet: sichtbar, aber passiv. */
  dimmed: boolean
  onOpen: (item: ClothingItem) => void
}) {
  const url = useThumbnail(item.id)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: dimmed,
  })

  const label = item.title || category?.name || 'Kleidungsstück'

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[styles.card, isDragging ? styles.dragging : '', dimmed ? styles.dimmed : '']
        .filter(Boolean)
        .join(' ')}
      onClick={() => onOpen(item)}
      aria-label={`${label} öffnen`}
      data-testid="clothing-card"
      data-item-id={item.id}
      data-title={label}
      data-dimmed={dimmed ? 'true' : 'false'}
      {...listeners}
      {...attributes}
    >
      {url ? (
        <img
          className={styles.photo}
          src={url}
          alt=""
          draggable={false}
          /*
           * Entscheidend bei vollem Schrank: ohne diese beiden Angaben laedt und
           * dekodiert der Browser auch die Bilder, die weit rechts ausserhalb der
           * Bahn liegen. Gemessen waren das alle 200 auf einmal - jedes 400er-JPEG
           * belegt dekodiert rund 640 KB, macht ueber 100 MB fuer Bilder, die
           * niemand sieht.
           */
          loading="lazy"
          decoding="async"
          width={THUMB_DISPLAY_PX}
          height={THUMB_DISPLAY_PX}
        />
      ) : (
        /*
         * Ohne Foto steht das Symbol der Kategorie da - das ist die Angabe des
         * Nutzers und bleibt ein Emoji. Nur wenn auch die fehlt, kommt ein Icon
         * der Oberflaeche zum Zug.
         */
        <span className={styles.placeholder} aria-hidden="true">
          {category ? category.emoji : <IconClothing className="icon icon--lg" />}
        </span>
      )}

      <span className={styles.caption}>
        {category && (
          <span
            className={styles.badge}
            style={{ background: category.colorHex }}
            aria-hidden="true"
          />
        )}
        <span className={styles.name}>{label}</span>
      </span>
    </button>
  )
}

/** Die Karte, die beim Ziehen unter dem Finger schwebt. */
export function ClothingCardOverlay({
  item,
  category,
}: {
  item: ClothingItem
  category: Category | undefined
}) {
  const url = useThumbnail(item.id)

  return (
    <div className={`${styles.card} ${styles.overlay}`} data-testid="drag-overlay">
      {url ? (
        // Haengt am Finger und ist damit immer sichtbar - hier waere Aufschieben falsch.
        <img className={styles.photo} src={url} alt="" draggable={false} decoding="sync" />
      ) : (
        <span className={styles.placeholder} aria-hidden="true">
          {category ? category.emoji : <IconClothing className="icon icon--lg" />}
        </span>
      )}
      <span className={styles.caption}>
        <span className={styles.name}>{item.title || category?.name || ''}</span>
      </span>
    </div>
  )
}
