import { useDraggable } from '@dnd-kit/core'

import type { Category, ClothingItem } from '../data/types.ts'
import { useThumbnail } from '../lib/useThumbnail.ts'
import styles from './ClothingCard.module.css'

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
        <img className={styles.photo} src={url} alt="" draggable={false} />
      ) : (
        <span className={styles.placeholder} aria-hidden="true">
          {category?.emoji ?? '👕'}
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
        <img className={styles.photo} src={url} alt="" draggable={false} />
      ) : (
        <span className={styles.placeholder} aria-hidden="true">
          {category?.emoji ?? '👕'}
        </span>
      )}
      <span className={styles.caption}>
        <span className={styles.name}>{item.title || category?.name || ''}</span>
      </span>
    </div>
  )
}
