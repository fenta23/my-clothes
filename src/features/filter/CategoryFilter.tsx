import type { Category } from '../../entities/category/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import styles from './CategoryFilter.module.css'

/**
 * Die Chip-Leiste zum Filtern nach Kategorie.
 *
 * Rein darstellend - Auswahl und Ableitung liegen in `useCategoryFilter`, damit die
 * Logik ohne Rendern pruefbar ist.
 */
export function CategoryFilter({
  categories,
  selected,
  onToggle,
  onReset,
}: {
  categories: readonly Category[]
  selected: ReadonlySet<Id>
  onToggle: (categoryId: Id) => void
  onReset: () => void
}) {
  return (
    <div className={styles.row} role="group" aria-label="Nach Kategorie filtern">
      <button
        type="button"
        aria-pressed={selected.size === 0}
        className={`glass glass--pill ${styles.chip} ${
          selected.size === 0 ? styles.chipActive : ''
        }`}
        onClick={onReset}
        data-testid="filter-alle"
      >
        Alle
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={selected.has(category.id)}
          className={`glass glass--pill ${styles.chip} ${
            selected.has(category.id) ? styles.chipActive : ''
          }`}
          onClick={() => onToggle(category.id)}
          data-testid="filter-chip"
          data-category={category.name}
        >
          <span aria-hidden="true">{category.emoji}</span>
          {category.name}
        </button>
      ))}
    </div>
  )
}
