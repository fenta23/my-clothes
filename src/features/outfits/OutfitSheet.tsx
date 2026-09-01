import { useMemo, useState } from 'react'

import type { Category } from '../../entities/category/types.ts'
import type { Outfit } from '../../entities/outfit/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { Sheet } from '../../shared/ui/Sheet.tsx'
import controls from '../../shared/ui/controls.module.css'
import { shallowArrayEqual } from '../../shared/store/useStore.ts'
import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import {
  outfitStatusEqual,
  selectCategories,
  selectOutfitItems,
  selectOutfitStatus,
} from '../../store/selectors.ts'
import { OutfitFigure } from './OutfitFigure.tsx'
import { outfitStatusText } from './outfitStatusText.ts'
import styles from './OutfitSheet.module.css'

/* Klein genug, dass ein Outfit aus fuenf Teilen noch ohne Scrollen ins Blatt passt. */
const FIGURE_SIZE_PX = 72

/** Ein Outfit in gross: die Figur, der Aufenthaltsort seiner Teile und die Bedienung. */
export function OutfitSheet({
  outfit,
  onEdit,
  onClose,
}: {
  outfit: Outfit
  onEdit: () => void
  onClose: () => void
}) {
  const categories = useWardrobe(selectCategories)
  const items = useWardrobe(
    useMemo(() => selectOutfitItems(outfit.id), [outfit.id]),
    shallowArrayEqual,
  )
  const status = useWardrobe(
    useMemo(() => selectOutfitStatus(outfit.id), [outfit.id]),
    outfitStatusEqual,
  )
  const store = useWardrobeStore()

  const [name, setName] = useState(outfit.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categoriesById = useMemo(
    () => new Map<Id, Category>(categories.map((c) => [c.id, c])),
    [categories],
  )

  const verteilt = status.jeHaushalt.length > 1

  return (
    <Sheet label={`Outfit ${outfit.name}`} testId="outfit-sheet" onClose={onClose}>
      <div className={controls.field}>
        <label className={controls.label} htmlFor="outfit-titel">
          Name
        </label>
        <input
          id="outfit-titel"
          className={controls.input}
          value={name}
          data-testid="outfit-titel"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== outfit.name) {
              void store.renameOutfit(outfit.id, name)
            }
          }}
        />
      </div>

      <OutfitFigure items={items} categoriesById={categoriesById} size={FIGURE_SIZE_PX} />

      <p
        className={`${styles.status} ${verteilt ? styles.statusVerteilt : ''}`}
        data-testid="outfit-status"
        data-verteilt={verteilt ? 'true' : 'false'}
      >
        {outfitStatusText(status)}
      </p>

      <button
        type="button"
        className={controls.secondary}
        data-testid="outfit-teile-aendern"
        onClick={onEdit}
      >
        Teile ändern
      </button>

      {confirmDelete ? (
        <div className={controls.confirm} data-testid="outfit-loesch-bestaetigung">
          <span>
            Dieses Outfit löschen? Die Kleidungsstücke bleiben erhalten — nur die
            Zusammenstellung verschwindet.
          </span>

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
              onClick={() => void store.deleteOutfit(outfit.id).then(onClose)}
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
