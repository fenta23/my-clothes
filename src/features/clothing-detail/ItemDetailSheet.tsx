import { useEffect, useState } from 'react'

import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import { selectCategories, selectHouseholds } from '../../store/selectors.ts'
import type { ClothingItem } from '../../entities/clothing/types.ts'
import type { ItemEvent } from '../../entities/event/types.ts'
import type { HouseholdRef } from '../../entities/household/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { useObjectUrl } from '../../shared/lib/useObjectUrl.ts'
import { Sheet } from '../../shared/ui/Sheet.tsx'
import controls from '../../shared/ui/controls.module.css'
import styles from './ItemDetailSheet.module.css'
import { ItemTimeline } from './ItemTimeline.tsx'

/**
 * Detailansicht eines Kleidungsstuecks.
 *
 * Enthaelt bewusst auch den Weg, den Haushalt ohne Geste zu wechseln: nicht jede Hand
 * trifft eine Wischbewegung zuverlaessig, und ueber die Tastatur ist es der einzige
 * Weg. Er laeuft durch dieselbe Funktion wie das Ziehen und wird deshalb genauso
 * protokolliert.
 */
export function ItemDetailSheet({
  item,
  onClose,
}: {
  item: ClothingItem
  onClose: () => void
}) {
  const households = useWardrobe(selectHouseholds)
  const categories = useWardrobe(selectCategories)
  const store = useWardrobeStore()

  const [full, setFull] = useState<Blob | null>(null)
  const [events, setEvents] = useState<ItemEvent[]>([])
  const [title, setTitle] = useState(item.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const photoUrl = useObjectUrl(full)

  useEffect(() => {
    let cancelled = false

    void store.loadImages(item.id).then((images) => {
      if (!cancelled) setFull(images?.full ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [item.id, store])

  // Nach jeder Aenderung neu laden: der Verlauf soll den eigenen Klick zeigen.
  useEffect(() => {
    let cancelled = false

    void store.listEvents(item.id).then((loaded) => {
      if (!cancelled) setEvents(loaded)
    })

    return () => {
      cancelled = true
    }
  }, [item.id, item.updatedAt, store])

  async function handleMove(target: HouseholdRef) {
    if (target === item.householdId) return
    await store.moveItem(item.id, target)
    setEvents(await store.listEvents(item.id))
  }

  async function handleCategory(categoryId: Id) {
    await store.setItemCategory(item.id, categoryId === item.categoryId ? null : categoryId)
    setEvents(await store.listEvents(item.id))
  }

  return (
    <Sheet
      label={`${item.title || 'Kleidungsstück'} bearbeiten`}
      testId="detail-sheet"
      onClose={onClose}
    >
      {photoUrl && (
        <img
          className={styles.photo}
          src={photoUrl}
          alt=""
          draggable={false}
          data-testid="detail-foto"
        />
      )}

      <div className={controls.field}>
        <label className={controls.label} htmlFor="detail-titel">
          Name
        </label>
        <input
          id="detail-titel"
          className={controls.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title.trim() !== item.title) void store.renameItem(item.id, title)
          }}
          placeholder="z. B. Lieblingshose"
          data-testid="detail-titel"
        />
      </div>

      <div className={controls.field}>
        <span className={controls.label}>Kategorie</span>
        <div className={controls.chips}>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={item.categoryId === category.id}
              className={`${controls.chip} ${
                item.categoryId === category.id ? controls.chipActive : ''
              }`}
              onClick={() => void handleCategory(category.id)}
              data-testid="detail-kategorie-chip"
              data-category={category.name}
            >
              <span aria-hidden="true">{category.emoji}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className={controls.field}>
        <span className={controls.label}>Wo ist es gerade?</span>
        <div className={controls.chips}>
          <button
            type="button"
            aria-pressed={item.householdId === null}
            className={`${controls.chip} ${
              item.householdId === null ? controls.chipActive : ''
            }`}
            onClick={() => void handleMove(null)}
            data-testid="detail-haushalt-chip"
            data-target="inbox"
          >
            Noch offen
          </button>

          {households.map((household) => (
            <button
              key={household.id}
              type="button"
              aria-pressed={item.householdId === household.id}
              className={`${controls.chip} ${
                item.householdId === household.id ? controls.chipActive : ''
              }`}
              onClick={() => void handleMove(household.id)}
              data-testid="detail-haushalt-chip"
              data-target={household.name}
            >
              {household.name}
            </button>
          ))}
        </div>
      </div>

      <ItemTimeline events={events} />

      {confirmDelete ? (
        <div className={controls.confirm} data-testid="loesch-bestaetigung">
          <span>Dieses Kleidungsstück endgültig löschen? Das Foto geht mit verloren.</span>

          <div className={controls.confirmActions}>
            <button
              type="button"
              className={controls.secondary}
              data-testid="behalten"
              onClick={() => setConfirmDelete(false)}
            >
              Behalten
            </button>
            <button
              type="button"
              className={controls.danger}
              data-testid="loeschen-endgueltig"
              onClick={() => void store.deleteItem(item.id).then(onClose)}
            >
              Löschen
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={controls.secondary}
            data-testid="fertig"
            onClick={onClose}
          >
            Fertig
          </button>
          <button
            type="button"
            className={controls.danger}
            data-testid="loeschen"
            onClick={() => setConfirmDelete(true)}
          >
            Löschen
          </button>
        </div>
      )}
    </Sheet>
  )
}
