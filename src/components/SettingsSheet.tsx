import { useState } from 'react'

import { useClothes } from '../data/ClothesProvider.tsx'
import type { Category } from '../data/types.ts'
import { formatTimestamp } from '../lib/eventText.ts'
import styles from './SettingsSheet.module.css'

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
  const index = PALETTE.indexOf(current)

  return PALETTE[(index + 1) % PALETTE.length] ?? PALETTE[0]!
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
  const { updateCategory, deleteCategory, moveCategory } = useClothes()

  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      data-testid="kategorie-zeile"
      data-category={category.name}
      data-index={index}
    >
      <div className={styles.row}>
        <input
          className={styles.emojiInput}
          value={emoji}
          maxLength={4}
          aria-label={`Symbol für ${category.name}`}
          data-testid="kategorie-emoji"
          onChange={(e) => setEmoji(e.target.value)}
          onBlur={() => {
            if (emoji !== category.emoji) void updateCategory(category.id, { emoji })
          }}
        />

        <input
          className={styles.nameInput}
          value={name}
          aria-label={`Name von ${category.name}`}
          data-testid="kategorie-name"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== category.name) {
              void updateCategory(category.id, { name })
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
            void updateCategory(category.id, { colorHex: nextColor(category.colorHex) })
          }
        />

        <button
          type="button"
          className={styles.iconButton}
          disabled={index === 0}
          aria-label={`${category.name} nach oben`}
          data-testid="kategorie-hoch"
          onClick={() => void moveCategory(category.id, 'up')}
        >
          ↑
        </button>

        <button
          type="button"
          className={styles.iconButton}
          disabled={index === total - 1}
          aria-label={`${category.name} nach unten`}
          data-testid="kategorie-runter"
          onClick={() => void moveCategory(category.id, 'down')}
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
        <div className={styles.confirm} data-testid="kategorie-loesch-bestaetigung">
          <span>
            {itemCount === 0
              ? `„${category.name}“ löschen?`
              : `„${category.name}“ löschen? Die ${itemCount} ${
                  itemCount === 1 ? 'Stück bleibt' : 'Stücke bleiben'
                } erhalten und ${itemCount === 1 ? 'ist' : 'sind'} danach ohne Kategorie.`}
          </span>

          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.secondary}
              data-testid="kategorie-behalten"
              onClick={() => setConfirming(false)}
            >
              Behalten
            </button>
            <button
              type="button"
              className={styles.primary}
              data-testid="kategorie-loeschen-endgueltig"
              onClick={() => void deleteCategory(category.id)}
            >
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { households, categories, itemsPerCategory, renameHousehold, addCategory } =
    useClothes()

  const [newName, setNewName] = useState('')

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`glass glass--strong ${styles.sheet}`}
        role="dialog"
        aria-modal="true"
        aria-label="Einstellungen"
        data-testid="settings-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.grabber} />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Haushalte</h2>

          {households.map((household) => (
            <HouseholdRow
              key={household.id}
              id={household.id}
              name={household.name}
              onRename={renameHousehold}
            />
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kategorien</h2>

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
              className={styles.input}
              value={newName}
              placeholder="Neue Kategorie…"
              aria-label="Neue Kategorie"
              data-testid="neue-kategorie-eingabe"
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="button"
              className={styles.primary}
              disabled={newName.trim() === ''}
              data-testid="neue-kategorie-anlegen"
              onClick={() => {
                const colorHex = PALETTE[categories.length % PALETTE.length]!
                void addCategory({ name: newName, emoji: '🏷️', colorHex })
                setNewName('')
              }}
            >
              Anlegen
            </button>
          </div>
        </section>

        <button
          type="button"
          className={styles.done}
          data-testid="einstellungen-fertig"
          onClick={onClose}
        >
          Fertig
        </button>
      </div>
    </div>
  )
}

function HouseholdRow({
  id,
  name,
  onRename,
}: {
  id: string
  name: string
  onRename: (id: string, name: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(name)

  return (
    <input
      className={styles.input}
      value={draft}
      aria-label={`Name von ${name}`}
      data-testid="haushalt-name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        // Leere Namen wuerden die Bahn unbeschriftet lassen.
        if (draft.trim() && draft.trim() !== name) void onRename(id, draft)
        else setDraft(name)
      }}
    />
  )
}
