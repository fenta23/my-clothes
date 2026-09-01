import { useMemo, useState } from 'react'

import type { Category } from '../entities/category/types.ts'
import { OutfitEditorSheet } from '../features/outfits/OutfitEditorSheet.tsx'
import { OutfitList } from '../features/outfits/OutfitList.tsx'
import { OutfitSheet } from '../features/outfits/OutfitSheet.tsx'
import type { Id } from '../shared/db/ids.ts'
import { IconAdd } from '../shared/ui/icons.ts'
import { useWardrobe } from '../store/StoreProvider.tsx'
import { selectCategories, selectOutfitById, selectOutfits } from '../store/selectors.ts'
import screen from './screen.module.css'

/**
 * Der zweite Bildschirm: gespeicherte Zusammenstellungen.
 *
 * Die Kachel beantwortet auf einen Blick, was die App als einzige weiss - ob die
 * Teile eines Outfits gerade beisammen sind oder auf beide Haushalte verteilt.
 *
 * Setzt wie `Wardrobe` nur Features zusammen; Kopfzeile und Menue liegen in `Shell`.
 */
export function Outfits() {
  const outfits = useWardrobe(selectOutfits)
  const categories = useWardrobe(selectCategories)

  const [openId, setOpenId] = useState<Id | null>(null)
  /** `null` heisst: ein neues Outfit anlegen. */
  const [editing, setEditing] = useState<'neu' | 'vorhanden' | null>(null)

  const categoriesById = useMemo(
    () => new Map<Id, Category>(categories.map((c) => [c.id, c])),
    [categories],
  )

  const openOutfit = useWardrobe(useMemo(() => selectOutfitById(openId), [openId]))

  return (
    <div className={screen.content} data-testid="outfits">
      <OutfitList
        outfits={outfits}
        categoriesById={categoriesById}
        onOpen={(outfit) => setOpenId(outfit.id)}
      />

      {/*
        Nur sichtbar, solange kein Blatt offen ist: das Glas der Blaetter ist
        durchscheinend, und der kraeftige Knopf blitzte sonst durch die Bedienung.
      */}
      {!openOutfit && editing === null && (
        <button
          type="button"
          className={screen.addButton}
          onClick={() => setEditing('neu')}
          data-testid="outfit-anlegen"
        >
          <IconAdd className="icon" aria-hidden="true" /> Outfit
        </button>
      )}

      {editing === 'neu' && <OutfitEditorSheet onClose={() => setEditing(null)} />}

      {openOutfit && editing === 'vorhanden' && (
        <OutfitEditorSheet outfit={openOutfit} onClose={() => setEditing(null)} />
      )}

      {openOutfit && editing === null && (
        <OutfitSheet
          outfit={openOutfit}
          onEdit={() => setEditing('vorhanden')}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
