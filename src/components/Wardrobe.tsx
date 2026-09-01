import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'

import { useClothes } from '../data/ClothesProvider.tsx'
import type { ClothingItem } from '../data/types.ts'
import { AddClothingSheet } from './AddClothingSheet.tsx'
import { ClothingCardOverlay } from './ClothingCard.tsx'
import { ItemDetailSheet } from './ItemDetailSheet.tsx'
import { Lane, refFromDropId } from './Lane.tsx'
import { SettingsSheet } from './SettingsSheet.tsx'
import styles from './Wardrobe.module.css'

/**
 * Der Hauptbildschirm: drei Bahnen uebereinander.
 *
 * Oben und unten je ein Haushalt, dazwischen alles, was noch nicht zugeordnet ist.
 * Verschoben wird durch senkrechtes Ziehen - waagerecht bleibt dem Scrollen der
 * Bahn vorbehalten, dafuer sorgt `touch-action: pan-x` auf den Karten.
 */
export function Wardrobe() {
  const { ready, error, households, categories, items, moveItem } = useClothes()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filter, setFilter] = useState<Set<string>>(new Set())

  /*
   * Ziehen startet, sobald der Finger acht Pixel zurueckgelegt hat. Kein
   * Stillhalten - die Richtungsentscheidung trifft der Browser ueber touch-action.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  /** `null` = kein Filter aktiv, alles ist vollwertig sichtbar. */
  const visibleIds = useMemo(() => {
    if (filter.size === 0) return null

    return new Set(
      items.filter((i) => i.categoryId && filter.has(i.categoryId)).map((i) => i.id),
    )
  }, [items, filter])

  const openItem = items.find((i) => i.id === openItemId) ?? null
  const activeItem = items.find((i) => i.id === activeId) ?? null

  const [top, bottom] = households

  function itemsIn(householdId: string | null): ClothingItem[] {
    return items.filter((i) => i.householdId === householdId)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (!event.over) return

    void moveItem(String(event.active.id), refFromDropId(String(event.over.id)))
  }

  function toggleFilter(categoryId: string) {
    setFilter((current) => {
      const next = new Set(current)
      if (!next.delete(categoryId)) next.add(categoryId)

      return next
    })
  }

  if (error) {
    return (
      <div className={styles.screen}>
        <div className="appBackdrop" aria-hidden="true" />
        <p className={styles.error} data-testid="db-fehler">
          Die Datenbank konnte nicht geöffnet werden. Läuft die App im privaten Modus?
        </p>
      </div>
    )
  }

  if (!ready || !top || !bottom) {
    return (
      <div className={styles.screen}>
        <div className="appBackdrop" aria-hidden="true" />
        <p className={styles.loading} data-testid="laedt">
          Kleiderschrank wird geöffnet…
        </p>
      </div>
    )
  }

  return (
    <div className={styles.screen} data-testid="wardrobe">
      <div className="appBackdrop" aria-hidden="true" />

      <div className={styles.topBar}>
        <span className={styles.brand}>Kleiderschrank</span>

        <button
          type="button"
          className={`glass glass--pill ${styles.iconButton}`}
          aria-label="Einstellungen"
          data-testid="settings-button"
          onClick={() => setSettingsOpen(true)}
        >
          <span aria-hidden="true">⚙︎</span>
        </button>
      </div>

      <div className={styles.filterRow} role="group" aria-label="Nach Kategorie filtern">
        <button
          type="button"
          aria-pressed={filter.size === 0}
          className={`glass glass--pill ${styles.filterChip} ${
            filter.size === 0 ? styles.filterChipActive : ''
          }`}
          onClick={() => setFilter(new Set())}
          data-testid="filter-alle"
        >
          Alle
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={filter.has(category.id)}
            className={`glass glass--pill ${styles.filterChip} ${
              filter.has(category.id) ? styles.filterChipActive : ''
            }`}
            onClick={() => toggleFilter(category.id)}
            data-testid="filter-chip"
            data-category={category.name}
          >
            <span aria-hidden="true">{category.emoji}</span>
            {category.name}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={styles.lanes}>
          <Lane
            testId="lane-top"
            householdRef={top.id}
            title={top.name}
            items={itemsIn(top.id)}
            categoriesById={categoriesById}
            visibleIds={visibleIds}
            emptyHint={`Noch nichts bei ${top.name}`}
            onOpenItem={(item) => setOpenItemId(item.id)}
          />

          <Lane
            testId="lane-inbox"
            householdRef={null}
            title="Neu — wo ist das gerade?"
            items={itemsIn(null)}
            categoriesById={categoriesById}
            visibleIds={visibleIds}
            emptyHint="Alles zugeordnet"
            onOpenItem={(item) => setOpenItemId(item.id)}
          />

          <Lane
            testId="lane-bottom"
            householdRef={bottom.id}
            title={bottom.name}
            items={itemsIn(bottom.id)}
            categoriesById={categoriesById}
            visibleIds={visibleIds}
            emptyHint={`Noch nichts bei ${bottom.name}`}
            onOpenItem={(item) => setOpenItemId(item.id)}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <ClothingCardOverlay
              item={activeItem}
              category={
                activeItem.categoryId
                  ? categoriesById.get(activeItem.categoryId)
                  : undefined
              }
            />
          )}
        </DragOverlay>
      </DndContext>

      <button
        type="button"
        className={styles.addButton}
        onClick={() => setAdding(true)}
        data-testid="add-button"
      >
        <span aria-hidden="true">＋</span> Kleidung
      </button>

      {adding && <AddClothingSheet onClose={() => setAdding(false)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {openItem && (
        <ItemDetailSheet item={openItem} onClose={() => setOpenItemId(null)} />
      )}
    </div>
  )
}
