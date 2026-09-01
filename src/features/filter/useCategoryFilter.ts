import { useCallback, useMemo, useState } from 'react'

import type { ClothingItem } from '../../entities/clothing/types.ts'
import type { Id } from '../../shared/db/ids.ts'

export interface CategoryFilter {
  selected: ReadonlySet<Id>
  toggle: (categoryId: Id) => void
  reset: () => void
  /**
   * Die Menge der Kleidungsstuecke, die zum Filter passen - oder `null`, wenn kein
   * Filter aktiv ist.
   *
   * `null` statt "alle IDs" ist Absicht: so muss die Karte nicht wissen, wie viele
   * Stuecke es insgesamt gibt, und der haeufigste Fall kostet keine Mengenbildung.
   */
  visibleIds: ReadonlySet<Id> | null
}

export function useCategoryFilter(items: readonly ClothingItem[]): CategoryFilter {
  const [selected, setSelected] = useState<ReadonlySet<Id>>(() => new Set())

  const toggle = useCallback((categoryId: Id) => {
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(categoryId)) next.add(categoryId)

      return next
    })
  }, [])

  const reset = useCallback(() => setSelected(new Set()), [])

  const visibleIds = useMemo(() => {
    if (selected.size === 0) return null

    return new Set(
      items.filter((i) => i.categoryId && selected.has(i.categoryId)).map((i) => i.id),
    )
  }, [items, selected])

  return { selected, toggle, reset, visibleIds }
}
