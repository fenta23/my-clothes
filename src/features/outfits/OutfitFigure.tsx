import { SLOT_ORDER, slotFor } from '../../entities/category/slots.ts'
import type { BodySlot, Category } from '../../entities/category/types.ts'
import type { ClothingItem } from '../../entities/clothing/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { Thumb } from '../../shared/ui/Thumb.tsx'
import { useThumbnail } from '../../store/useThumbnail.ts'
import styles from './OutfitFigure.module.css'

/**
 * Die Collage eines Outfits, angeordnet wie am Koerper.
 *
 * Bewusst keine Puppe mit freigestellten Teilen: die Vorschaubilder sind JPEG ohne
 * Transparenz - uebereinandergelegt ergaeben sie ueberlappende Quadrate, keine Figur.
 * Und ein Freistellen im Browser braeuchte ein Modell von mehreren Megabyte, das bei
 * Fotos auf Bett oder Boden trotzdem unsaubere Kanten liefert.
 *
 * Stattdessen bleiben die Fotos wie sie sind und stehen in der Reihenfolge, in der
 * man sie anzieht. Welcher Trageort das ist, sagt die Kategorie (`slotFor`).
 */
export function OutfitFigure({
  items,
  categoriesById,
  size,
  max,
}: {
  items: readonly ClothingItem[]
  categoriesById: Map<Id, Category>
  /** Kantenlaenge eines Teils in CSS-Pixeln. */
  size: number
  /**
   * Hoechstzahl gezeigter Teile; der Rest erscheint als "+n".
   *
   * Gemessen und nicht geschaetzt: ohne Deckel laedt die Uebersicht bei 40 Outfits
   * mit je fuenf Teilen alle 200 Vorschaubilder auf einmal - jedes 400er-JPEG belegt
   * dekodiert rund 640 KB. Genau der Fehler, der bei den Bahnen schon einmal
   * gemessen wurde.
   */
  max?: number
}) {
  const zeilen = new Map<BodySlot, ClothingItem[]>()
  let uebrig = max ?? Number.POSITIVE_INFINITY
  let versteckt = 0

  for (const slot of [...SLOT_ORDER, 'sonstiges' as const]) {
    for (const item of items) {
      const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined
      if ((category ? slotFor(category) : 'sonstiges') !== slot) continue

      if (uebrig <= 0) {
        versteckt += 1
        continue
      }

      uebrig -= 1
      zeilen.set(slot, [...(zeilen.get(slot) ?? []), item])
    }
  }

  const sonstiges = zeilen.get('sonstiges') ?? []

  return (
    <div className={styles.figure} data-testid="outfit-figur">
      <div className={styles.silhouette} aria-hidden="true" />

      {items.length === 0 && <p className={styles.empty}>Noch nichts angezogen</p>}

      {SLOT_ORDER.map((slot) => {
        const zeile = zeilen.get(slot)
        if (!zeile?.length) return null

        return (
          <div key={slot} className={styles.row} data-testid="figur-zeile" data-slot={slot}>
            {zeile.map((item) => (
              <Teil
                key={item.id}
                item={item}
                category={item.categoryId ? categoriesById.get(item.categoryId) : undefined}
                size={size}
              />
            ))}
          </div>
        )
      })}

      {versteckt > 0 && (
        <span className={styles.rest} data-testid="figur-rest">
          +{versteckt}
        </span>
      )}

      {sonstiges.length > 0 && (
        <div className={styles.extras} data-testid="figur-zeile" data-slot="sonstiges">
          {sonstiges.map((item) => (
            <Teil
              key={item.id}
              item={item}
              category={item.categoryId ? categoriesById.get(item.categoryId) : undefined}
              size={size}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Teil({
  item,
  category,
  size,
}: {
  item: ClothingItem
  category: Category | undefined
  size: number
}) {
  const url = useThumbnail(item.id)
  const label = item.title || category?.name || 'Kleidungsstück'

  return (
    <span
      className={styles.piece}
      style={{ width: size }}
      title={label}
      data-testid="figur-teil"
      data-title={label}
      data-item-id={item.id}
    >
      <Thumb
        url={url}
        emoji={category?.emoji}
        size={size}
        className={styles.photo}
        placeholderClassName={styles.placeholder}
      />
      {category && (
        <span
          className={styles.badge}
          style={{ background: category.colorHex }}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
