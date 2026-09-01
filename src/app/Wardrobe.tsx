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

import type { Category } from '../entities/category/types.ts'
import { AddClothingSheet } from '../features/clothing-import/AddClothingSheet.tsx'
import { ItemDetailSheet } from '../features/clothing-detail/ItemDetailSheet.tsx'
import { CategoryFilter } from '../features/filter/CategoryFilter.tsx'
import { useCategoryFilter } from '../features/filter/useCategoryFilter.ts'
import { ClothingCardOverlay } from '../features/wardrobe/ClothingCard.tsx'
import { Lane, refFromDropId } from '../features/wardrobe/Lane.tsx'
import type { Id } from '../shared/db/ids.ts'
import { MainMenu } from './MainMenu.tsx'
import { useWardrobe, useWardrobeStore } from '../store/StoreProvider.tsx'
import {
  selectCategories,
  selectHouseholds,
  selectItemById,
  selectItems,
  selectItemsIn,
  selectStatus,
} from '../store/selectors.ts'
import styles from './Wardrobe.module.css'

/**
 * Der Hauptbildschirm: drei Bahnen uebereinander.
 *
 * Oben und unten je ein Haushalt, dazwischen alles, was noch nicht zugeordnet ist.
 * Verschoben wird durch senkrechtes Ziehen - waagerecht bleibt dem Scrollen der Bahn
 * vorbehalten, dafuer sorgt `touch-action: pan-x` auf den Karten.
 *
 * Setzt die Features zusammen und kennt als einziger Ort alle davon.
 */
export function Wardrobe() {
  const status = useWardrobe(selectStatus)
  const households = useWardrobe(selectHouseholds)
  const categories = useWardrobe(selectCategories)
  const items = useWardrobe(selectItems)
  const store = useWardrobeStore()

  const [activeId, setActiveId] = useState<Id | null>(null)
  const [openItemId, setOpenItemId] = useState<Id | null>(null)
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const filter = useCategoryFilter(items)

  /*
   * Ziehen startet, sobald der Finger acht Pixel zurueckgelegt hat. Kein Stillhalten -
   * die Richtungsentscheidung trifft der Browser ueber touch-action.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const categoriesById = useMemo(
    () => new Map<Id, Category>(categories.map((c) => [c.id, c])),
    [categories],
  )

  const openItem = useWardrobe(useMemo(() => selectItemById(openItemId), [openItemId]))
  const activeItem = useWardrobe(useMemo(() => selectItemById(activeId), [activeId]))

  const [top, bottom] = households

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (!event.over) return

    void store.moveItem(String(event.active.id), refFromDropId(String(event.over.id)))
  }

  if (status === 'fehler') {
    return (
      <div className={styles.screen}>
        <div className="appBackdrop" aria-hidden="true" />
        <p className={styles.error} data-testid="db-fehler">
          Die Datenbank konnte nicht geöffnet werden. Läuft die App im privaten Modus?
        </p>
      </div>
    )
  }

  if (status !== 'bereit' || !top || !bottom) {
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
          aria-label="Menü"
          data-testid="menue-button"
          onClick={() => setMenuOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      <CategoryFilter
        categories={categories}
        selected={filter.selected}
        onToggle={filter.toggle}
        onReset={filter.reset}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={styles.lanes}>
          <LaneSlot
            testId="lane-top"
            householdId={top.id}
            title={top.name}
            categoriesById={categoriesById}
            visibleIds={filter.visibleIds}
            emptyHint={`Noch nichts bei ${top.name}`}
            onOpenItem={setOpenItemId}
          />

          <LaneSlot
            testId="lane-inbox"
            householdId={null}
            title="Neu — wo ist das gerade?"
            categoriesById={categoriesById}
            visibleIds={filter.visibleIds}
            emptyHint="Alles zugeordnet"
            onOpenItem={setOpenItemId}
          />

          <LaneSlot
            testId="lane-bottom"
            householdId={bottom.id}
            title={bottom.name}
            categoriesById={categoriesById}
            visibleIds={filter.visibleIds}
            emptyHint={`Noch nichts bei ${bottom.name}`}
            onOpenItem={setOpenItemId}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <ClothingCardOverlay
              item={activeItem}
              category={
                activeItem.categoryId ? categoriesById.get(activeItem.categoryId) : undefined
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
      {menuOpen && <MainMenu onClose={() => setMenuOpen(false)} />}
      {openItem && <ItemDetailSheet item={openItem} onClose={() => setOpenItemId(null)} />}
    </div>
  )
}

/**
 * Verbindet eine Bahn mit dem Store.
 *
 * Eigene Komponente, damit jede Bahn nur ihre eigenen Stuecke abonniert: ein
 * Verschieben in die obere Bahn rendert die untere nicht mit neu.
 */
function LaneSlot({
  testId,
  householdId,
  title,
  categoriesById,
  visibleIds,
  emptyHint,
  onOpenItem,
}: {
  testId: 'lane-top' | 'lane-inbox' | 'lane-bottom'
  householdId: Id | null
  title: string
  categoriesById: Map<Id, Category>
  visibleIds: ReadonlySet<Id> | null
  emptyHint: string
  onOpenItem: (id: Id) => void
}) {
  const items = useWardrobe(
    useMemo(() => selectItemsIn(householdId), [householdId]),
    arraysEqual,
  )

  return (
    <Lane
      testId={testId}
      householdRef={householdId}
      title={title}
      items={items}
      categoriesById={categoriesById}
      visibleIds={visibleIds}
      emptyHint={emptyHint}
      onOpenItem={(item) => onOpenItem(item.id)}
    />
  )
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
}
