import { useDraggable } from '@dnd-kit/core'

import type { Category } from '../../entities/category/types.ts'
import type { ClothingItem } from '../../entities/clothing/types.ts'
import { Thumb } from '../../shared/ui/Thumb.tsx'
import { useThumbnail } from '../../store/useThumbnail.ts'
import styles from './ClothingCard.module.css'

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
      {/*
        Ohne Foto steht das Symbol der Kategorie da - das ist die Angabe des
        Nutzers und bleibt ein Emoji. Nur wenn auch die fehlt, kommt ein Icon
        der Oberflaeche zum Zug.
      */}
      <Thumb
        url={url}
        emoji={category?.emoji}
        size={THUMB_DISPLAY_PX}
        className={styles.photo}
        placeholderClassName={styles.placeholder}
      />

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
      {/* Haengt am Finger und ist damit immer sichtbar - hier waere Aufschieben falsch. */}
      <Thumb
        url={url}
        emoji={category?.emoji}
        size={THUMB_DISPLAY_PX}
        className={styles.photo}
        placeholderClassName={styles.placeholder}
        eager
      />
      <span className={styles.caption}>
        <span className={styles.name}>{item.title || category?.name || ''}</span>
      </span>
    </div>
  )
}
