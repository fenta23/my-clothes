import { useEffect, useState } from 'react'

import { useClothes } from '../data/ClothesProvider.tsx'
import type { ClothingItem, HouseholdRef, ItemEvent } from '../data/types.ts'
import { describeEvent, formatTimestamp } from '../lib/eventText.ts'
import { useObjectUrl } from '../lib/useObjectUrl.ts'
import styles from './ItemDetailSheet.module.css'

/**
 * Detailansicht eines Kleidungsstuecks.
 *
 * Enthaelt bewusst auch den Weg, den Haushalt ohne Geste zu wechseln: nicht jede
 * Hand trifft eine Wischbewegung zuverlaessig, und ueber die Tastatur ist es der
 * einzige Weg. Er laeuft durch dieselbe Funktion wie Drag & Drop und wird deshalb
 * genauso protokolliert.
 */
export function ItemDetailSheet({
  item,
  onClose,
}: {
  item: ClothingItem
  onClose: () => void
}) {
  const {
    households,
    categories,
    loadImages,
    listEvents,
    moveItem,
    setItemCategory,
    renameItem,
    deleteItem,
  } = useClothes()

  const [full, setFull] = useState<Blob | null>(null)
  const [events, setEvents] = useState<ItemEvent[]>([])
  const [title, setTitle] = useState(item.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const photoUrl = useObjectUrl(full)

  useEffect(() => {
    let cancelled = false

    void loadImages(item.id).then((images) => {
      if (!cancelled) setFull(images?.full ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [item.id, loadImages])

  // Nach jeder Aenderung neu laden: die Zeitleiste soll den eigenen Klick zeigen.
  useEffect(() => {
    let cancelled = false

    void listEvents(item.id).then((loaded) => {
      if (!cancelled) setEvents(loaded)
    })

    return () => {
      cancelled = true
    }
  }, [item.id, item.updatedAt, listEvents])

  async function handleMove(target: HouseholdRef) {
    if (target === item.householdId) return
    await moveItem(item.id, target)
    setEvents(await listEvents(item.id))
  }

  async function handleCategory(categoryId: string | null) {
    const next = categoryId === item.categoryId ? null : categoryId
    await setItemCategory(item.id, next)
    setEvents(await listEvents(item.id))
  }

  const label = item.title || 'Kleidungsstück'

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`glass glass--strong ${styles.sheet}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} bearbeiten`}
        onClick={(e) => e.stopPropagation()}
        data-testid="detail-sheet"
      >
        <span className={styles.grabber} />

        {photoUrl && (
          <img
            className={styles.photo}
            src={photoUrl}
            alt=""
            draggable={false}
            data-testid="detail-foto"
          />
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="detail-titel">
            Name
          </label>
          <input
            id="detail-titel"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() !== item.title) void renameItem(item.id, title)
            }}
            placeholder="z. B. Lieblingshose"
            data-testid="detail-titel"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Kategorie</span>
          <div className={styles.chips}>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={item.categoryId === category.id}
                className={`${styles.chip} ${
                  item.categoryId === category.id ? styles.chipActive : ''
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

        <div className={styles.field}>
          <span className={styles.label}>Wo ist es gerade?</span>
          <div className={styles.chips}>
            <button
              type="button"
              aria-pressed={item.householdId === null}
              className={`${styles.chip} ${
                item.householdId === null ? styles.chipActive : ''
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
                className={`${styles.chip} ${
                  item.householdId === household.id ? styles.chipActive : ''
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

        <div className={styles.field}>
          <span className={styles.label}>Verlauf</span>
          <div className={styles.timeline} data-testid="verlauf">
            {events.map((event) => (
              <div key={event.id} className={styles.entry} data-testid="verlauf-eintrag">
                <span className={styles.entryText} data-testid="verlauf-text">
                  {describeEvent(event)}
                </span>
                <span className={styles.entryTime} data-testid="verlauf-zeit">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {confirmDelete ? (
          <div className={styles.confirm} data-testid="loesch-bestaetigung">
            <span>Dieses Kleidungsstück endgültig löschen? Das Foto geht mit verloren.</span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setConfirmDelete(false)}
                data-testid="behalten"
              >
                Behalten
              </button>
              <button
                type="button"
                className={styles.danger}
                onClick={() => {
                  void deleteItem(item.id).then(onClose)
                }}
                data-testid="loeschen-endgueltig"
              >
                Löschen
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={onClose}
              data-testid="fertig"
            >
              Fertig
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => setConfirmDelete(true)}
              data-testid="loeschen"
            >
              Löschen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
