import { useState } from 'react'

import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import { selectHouseholds } from '../../store/selectors.ts'
import type { Id } from '../../shared/db/ids.ts'
import controls from '../../shared/ui/controls.module.css'

/** Ein Eingabefeld je Haushalt; uebernommen wird beim Verlassen des Feldes. */
function HouseholdRow({
  id,
  name,
  onRename,
}: {
  id: Id
  name: string
  onRename: (id: Id, name: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(name)

  return (
    <input
      className={controls.input}
      value={draft}
      aria-label={`Name von ${name}`}
      data-testid="haushalt-name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        // Ein leerer Name wuerde die Bahn unbeschriftet lassen - schlimmer als der alte.
        if (draft.trim() && draft.trim() !== name) void onRename(id, draft)
        else setDraft(name)
      }}
    />
  )
}

export function HouseholdSettings() {
  const households = useWardrobe(selectHouseholds)
  const store = useWardrobeStore()

  return (
    <section className={controls.field} data-testid="haushalte-einstellungen">
      <h2 className={controls.sectionTitle}>Haushalte</h2>

      {households.map((household) => (
        <HouseholdRow
          key={household.id}
          id={household.id}
          name={household.name}
          onRename={store.renameHousehold}
        />
      ))}
    </section>
  )
}
