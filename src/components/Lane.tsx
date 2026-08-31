import { useDroppable } from '@dnd-kit/core'

import type { Category, ClothingItem, HouseholdRef } from '../data/types.ts'
import { ClothingCard } from './ClothingCard.tsx'
import styles from './Lane.module.css'

/** Die mittlere Bahn hat keine Haushalts-ID - das ist ihre Kennung. */
export const INBOX_DROP_ID = 'inbox'

export function dropIdFor(ref: HouseholdRef): string {
  return ref ?? INBOX_DROP_ID
}

export function refFromDropId(dropId: string): HouseholdRef {
  return dropId === INBOX_DROP_ID ? null : dropId
}

export function Lane({
  testId,
  householdRef,
  title,
  items,
  categoriesById,
  visibleIds,
  emptyHint,
  onOpenItem,
}: {
  /** Stabiler Anker fuer die E2E-Tests, unabhaengig vom angezeigten Namen. */
  testId: string
  householdRef: HouseholdRef
  title: string
  items: ClothingItem[]
  categoriesById: Map<string, Category>
  /** `null` = kein Filter aktiv. Sonst die Menge der nicht ausgegrauten Stuecke. */
  visibleIds: Set<string> | null
  emptyHint: string
  onOpenItem: (item: ClothingItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropIdFor(householdRef) })
  const isInbox = householdRef === null

  return (
    <section
      ref={setNodeRef}
      className={`glass glass--lg ${styles.lane} ${isOver ? styles.over : ''}`}
      aria-label={title}
      data-testid={testId}
      data-over={isOver ? 'true' : 'false'}
    >
      <header className={styles.header}>
        <h2
          className={`${styles.title} ${isInbox ? styles.inboxTitle : ''}`}
          data-testid="lane-title"
        >
          {title}
        </h2>
        <span className={styles.count} data-testid="lane-count">
          {items.length}
        </span>
      </header>

      <div className={styles.scroller} data-testid="lane-scroller">
        {items.length === 0 ? (
          <p className={styles.empty} data-testid="lane-empty">
            {emptyHint}
          </p>
        ) : (
          items.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              category={item.categoryId ? categoriesById.get(item.categoryId) : undefined}
              dimmed={visibleIds !== null && !visibleIds.has(item.id)}
              onOpen={onOpenItem}
            />
          ))
        )}
      </div>
    </section>
  )
}
