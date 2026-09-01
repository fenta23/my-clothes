import { useMemo } from 'react'

import type { Category } from '../../entities/category/types.ts'
import type { Outfit } from '../../entities/outfit/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { shallowArrayEqual } from '../../shared/store/useStore.ts'
import { useWardrobe } from '../../store/StoreProvider.tsx'
import {
  outfitStatusEqual,
  selectOutfitItems,
  selectOutfitStatus,
} from '../../store/selectors.ts'
import { OutfitFigure } from './OutfitFigure.tsx'
import { outfitStatusText } from './outfitStatusText.ts'
import styles from './OutfitList.module.css'

/** Kantenlaenge eines Teils in der Uebersicht - klein genug fuer eine Kachel. */
const PREVIEW_SIZE_PX = 40

/**
 * So viele Teile zeigt eine Kachel hoechstens.
 *
 * Gemessen in `e2e/performance.spec.ts`: ohne Deckel laedt die Uebersicht bei 40
 * Outfits alle 200 Vorschaubilder auf einmal. Die vollstaendige Figur steht im Blatt,
 * das immer nur ein Outfit zeigt.
 */
const PREVIEW_MAX_ITEMS = 3

export function OutfitList({
  outfits,
  categoriesById,
  onOpen,
}: {
  outfits: readonly Outfit[]
  categoriesById: Map<Id, Category>
  onOpen: (outfit: Outfit) => void
}) {
  if (outfits.length === 0) {
    return (
      <p className={styles.empty} data-testid="outfits-leer">
        Noch keine Outfits. Stell eines zusammen — die App sagt dir dann, ob alle Teile
        gerade am selben Ort sind.
      </p>
    )
  }

  return (
    <div className={styles.list} data-testid="outfit-liste">
      {outfits.map((outfit) => (
        <OutfitCard
          key={outfit.id}
          outfit={outfit}
          categoriesById={categoriesById}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

/**
 * Eine Kachel je Outfit.
 *
 * Eigene Komponente, damit jede Kachel nur ihre eigenen Teile abonniert: ein
 * Verschieben rendert sonst die ganze Liste neu.
 */
function OutfitCard({
  outfit,
  categoriesById,
  onOpen,
}: {
  outfit: Outfit
  categoriesById: Map<Id, Category>
  onOpen: (outfit: Outfit) => void
}) {
  const items = useWardrobe(
    useMemo(() => selectOutfitItems(outfit.id), [outfit.id]),
    shallowArrayEqual,
  )
  const status = useWardrobe(
    useMemo(() => selectOutfitStatus(outfit.id), [outfit.id]),
    outfitStatusEqual,
  )

  const verteilt = status.jeHaushalt.length > 1

  return (
    <button
      type="button"
      className={`glass ${styles.card}`}
      aria-label={`Outfit ${outfit.name} öffnen`}
      data-testid="outfit-karte"
      data-name={outfit.name}
      onClick={() => onOpen(outfit)}
    >
      <span className={styles.name}>{outfit.name}</span>

      <OutfitFigure
        items={items}
        categoriesById={categoriesById}
        size={PREVIEW_SIZE_PX}
        max={PREVIEW_MAX_ITEMS}
      />

      <span
        className={`${styles.status} ${verteilt ? styles.statusVerteilt : ''}`}
        data-testid="outfit-status"
        data-verteilt={verteilt ? 'true' : 'false'}
      >
        {outfitStatusText(status)}
      </span>
    </button>
  )
}
