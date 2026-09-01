import { useState } from 'react'

import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import { selectCategories, selectItemsPerCategory } from '../../store/selectors.ts'
import type { Category } from '../../entities/category/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { formatTimestamp } from '../../shared/lib/datetime.ts'
import controls from '../../shared/ui/controls.module.css'
import styles from './CategoryList.module.css'

/** Auswahl an Farben - freie Farbwahl waere fuer ein Kind mehr Last als Nutzen. */
const PALETTE = [
  '#4F7CFF',
  '#EC4899',
  '#A855F7',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#14B8A6',
  '#8B5CF6',
  '#F97316',
]

function nextColor(current: string): string {
  return PALETTE[(PALETTE.indexOf(current) + 1) % PALETTE.length] ?? PALETTE[0]!
}

function CategoryRow({
  category,
  index,
  total,
  itemCount,
}: {
  category: Category
  index: number
  total: number
  itemCount: number
}) {
  const store = useWardrobeStore()

  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [confirming, setConfirming] = useState(false)

  return (
    <div data-testid="kategorie-zeile" data-category={category.name} data-index={index}>
      <div className={styles.row}>
        <input
          className={styles.emojiInput}
          value={emoji}
          maxLength={4}
          aria-label={`Symbol für ${category.name}`}
          data-testid="kategorie-emoji"
          onChange={(event) => setEmoji(event.target.value)}
          onBlur={() => {
            if (emoji !== category.emoji) void store.updateCategory(category.id, { emoji })
          }}
        />

        <input
          className={styles.nameInput}
          value={name}
          aria-label={`Name von ${category.name}`}
          data-testid="kategorie-name"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== category.name) {
              void store.updateCategory(category.id, { name })
            }
          }}
        />

        <button
          type="button"
          className={styles.swatch}
          style={{ background: category.colorHex }}
          aria-label={`Farbe von ${category.name} ändern`}
          data-testid="kategorie-farbe"
          onClick={() =>
            void store.updateCategory(category.id, { colorHex: nextColor(category.colorHex) })
          }
        />

        <button
          type="button"
          className={styles.iconButton}
          disabled={index === 0}
          aria-label={`${category.name} nach oben`}
          data-testid="kategorie-hoch"
          onClick={() => void store.moveCategory(category.id, 'up')}
        >
          ↑
        </button>

        <button
          type="button"
          className={styles.iconButton}
          disabled={index === total - 1}
          aria-label={`${category.name} nach unten`}
          data-testid="kategorie-runter"
          onClick={() => void store.moveCategory(category.id, 'down')}
        >
          ↓
        </button>

        <button
          type="button"
          className={`${styles.iconButton} ${styles.deleteButton}`}
          aria-label={`${category.name} löschen`}
          data-testid="kategorie-loeschen"
          onClick={() => setConfirming(true)}
        >
          ✕
        </button>
      </div>

      <p className={styles.meta} data-testid="kategorie-geaendert">
        {itemCount === 0
          ? 'Noch nicht verwendet'
          : `${itemCount} ${itemCount === 1 ? 'Stück' : 'Stücke'}`}
        {' · geändert am '}
        {formatTimestamp(category.updatedAt)}
      </p>

      {confirming && (
        <div className={controls.confirm} data-testid="kategorie-loesch-bestaetigung">
          <span>
            {itemCount === 0
              ? `„${category.name}“ löschen?`
              : `„${category.name}“ löschen? Die ${itemCount} ${
                  itemCount === 1 ? 'Stück bleibt' : 'Stücke bleiben'
                } erhalten und ${itemCount === 1 ? 'ist' : 'sind'} danach ohne Kategorie.`}
          </span>

          <div className={controls.confirmActions}>
            <button
              type="button"
              className={controls.secondary}
              data-testid="kategorie-behalten"
              onClick={() => setConfirming(false)}
            >
              Behalten
            </button>
            <button
              type="button"
              className={controls.primary}
              data-testid="kategorie-loeschen-endgueltig"
              onClick={() => void store.deleteCategory(category.id)}
            >
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CategoryList() {
  const categories = useWardrobe(selectCategories)
  const itemsPerCategory = useWardrobe(selectItemsPerCategory, mapsEqual)
  const store = useWardrobeStore()

  const [newName, setNewName] = useState('')

  return (
    <section className={controls.field} data-testid="kategorien-einstellungen">
      <h2 className={controls.sectionTitle}>Kategorien</h2>

      {categories.map((category, index) => (
        <CategoryRow
          key={category.id}
          category={category}
          index={index}
          total={categories.length}
          itemCount={itemsPerCategory.get(category.id) ?? 0}
        />
      ))}

      <div className={styles.newRow}>
        <input
          className={controls.input}
          value={newName}
          placeholder="Neue Kategorie…"
          aria-label="Neue Kategorie"
          data-testid="neue-kategorie-eingabe"
          onChange={(event) => setNewName(event.target.value)}
        />
        <button
          type="button"
          className={controls.primary}
          disabled={newName.trim() === ''}
          data-testid="neue-kategorie-anlegen"
          onClick={() => {
            const colorHex = PALETTE[categories.length % PALETTE.length]!
            void store.addCategory({ name: newName, emoji: '🏷️', colorHex })
            setNewName('')
          }}
        >
          Anlegen
        </button>
      </div>
    </section>
  )
}

/**
 * Die Zaehlung wird bei jedem Lesen neu gebildet; ohne Vergleich wuerde
 * `useSyncExternalStore` das als Aenderung sehen und endlos neu rendern.
 */
function mapsEqual(a: Map<Id, number>, b: Map<Id, number>): boolean {
  if (a.size !== b.size) return false

  for (const [key, value] of a) if (b.get(key) !== value) return false

  return true
}
