import { useMemo, useState } from 'react'

import type { Category } from '../../entities/category/types.ts'
import type { ClothingItem } from '../../entities/clothing/types.ts'
import type { Outfit } from '../../entities/outfit/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { Sheet } from '../../shared/ui/Sheet.tsx'
import { Thumb } from '../../shared/ui/Thumb.tsx'
import controls from '../../shared/ui/controls.module.css'
import { IconCheck } from '../../shared/ui/icons.ts'
import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import { selectCategories, selectItems } from '../../store/selectors.ts'
import { useThumbnail } from '../../store/useThumbnail.ts'
import styles from './OutfitEditorSheet.module.css'

const PICK_SIZE_PX = 84

/**
 * Teile fuer ein Outfit auswaehlen - fuer ein neues wie fuer ein vorhandenes.
 *
 * Antippen schaltet um, bewusst ohne Ziehen: die Arbitrierung zwischen waagerechtem
 * Wischen und senkrechtem Ziehen im Schrank war teuer erkaempft, und ein zweites
 * Gestenregime daneben wuerde sie wieder gefaehrden.
 */
export function OutfitEditorSheet({
  outfit,
  onClose,
}: {
  /** Fehlt beim Anlegen eines neuen Outfits. */
  outfit?: Outfit | undefined
  onClose: () => void
}) {
  const items = useWardrobe(selectItems)
  const categories = useWardrobe(selectCategories)
  const store = useWardrobeStore()

  const [name, setName] = useState(outfit?.name ?? '')
  const [gewaehlt, setGewaehlt] = useState<Id[]>(outfit?.itemIds ?? [])
  const [suche, setSuche] = useState('')

  const categoriesById = useMemo(
    () => new Map<Id, Category>(categories.map((c) => [c.id, c])),
    [categories],
  )

  const sichtbar = useMemo(() => {
    const begriff = suche.trim().toLowerCase()
    if (!begriff) return items

    return items.filter((item) => {
      const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined

      return (
        item.title.toLowerCase().includes(begriff) ||
        (category?.name.toLowerCase().includes(begriff) ?? false)
      )
    })
  }, [items, suche, categoriesById])

  function umschalten(id: Id) {
    setGewaehlt((current) =>
      current.includes(id) ? current.filter((vorhanden) => vorhanden !== id) : [...current, id],
    )
  }

  async function speichern() {
    const titel = name.trim() || 'Outfit'

    if (outfit) {
      await store.renameOutfit(outfit.id, titel)
      await store.setOutfitItems(outfit.id, gewaehlt)
    } else {
      await store.addOutfit({ name: titel, itemIds: gewaehlt })
    }

    onClose()
  }

  return (
    <Sheet
      label={outfit ? 'Teile des Outfits ändern' : 'Neues Outfit'}
      testId="outfit-editor"
      onClose={onClose}
    >
      <div className={controls.field}>
        <label className={controls.label} htmlFor="outfit-editor-name">
          Name
        </label>
        <input
          id="outfit-editor-name"
          className={controls.input}
          value={name}
          placeholder="Schultag, Geburtstag…"
          data-testid="outfit-editor-name"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className={controls.field}>
        <span className={controls.label}>
          Teile auswählen{gewaehlt.length > 0 ? ` (${gewaehlt.length})` : ''}
        </span>

        {items.length > 0 && (
          <input
            className={controls.input}
            value={suche}
            placeholder="Suchen…"
            aria-label="Kleidungsstücke durchsuchen"
            data-testid="outfit-suche"
            onChange={(event) => setSuche(event.target.value)}
          />
        )}

        {items.length === 0 ? (
          <p className={styles.empty}>Noch keine Kleidung im Schrank.</p>
        ) : sichtbar.length === 0 ? (
          <p className={styles.empty}>Nichts gefunden.</p>
        ) : (
          <div className={styles.grid} data-testid="outfit-auswahl">
            {sichtbar.map((item) => (
              <Auswahlstueck
                key={item.id}
                item={item}
                category={item.categoryId ? categoriesById.get(item.categoryId) : undefined}
                gewaehlt={gewaehlt.includes(item.id)}
                onToggle={() => umschalten(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={controls.secondary}
          data-testid="outfit-abbrechen"
          onClick={onClose}
        >
          Abbrechen
        </button>
        <button
          type="button"
          className={controls.primary}
          data-testid="outfit-speichern"
          onClick={() => void speichern()}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}

function Auswahlstueck({
  item,
  category,
  gewaehlt,
  onToggle,
}: {
  item: ClothingItem
  category: Category | undefined
  gewaehlt: boolean
  onToggle: () => void
}) {
  const url = useThumbnail(item.id)
  const label = item.title || category?.name || 'Kleidungsstück'

  return (
    <button
      type="button"
      className={`${styles.pick} ${gewaehlt ? styles.pickActive : ''}`}
      aria-pressed={gewaehlt}
      aria-label={label}
      data-testid="auswahl-stueck"
      data-title={label}
      data-item-id={item.id}
      onClick={onToggle}
    >
      <Thumb
        url={url}
        emoji={category?.emoji}
        size={PICK_SIZE_PX}
        className={styles.photo}
        placeholderClassName={styles.placeholder}
      />
      <span className={styles.name}>{label}</span>

      {gewaehlt && (
        <span className={styles.tick} aria-hidden="true">
          <IconCheck className="icon icon--sm" />
        </span>
      )}
    </button>
  )
}
