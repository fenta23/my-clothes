import { BackupSection } from '../features/backup/BackupSection.tsx'
import { CategoryList } from '../features/categories/CategoryList.tsx'
import { HouseholdSettings } from '../features/households/HouseholdSettings.tsx'
import { Sheet } from '../shared/ui/Sheet.tsx'
import controls from '../shared/ui/controls.module.css'

/**
 * Die Einstellungen setzen drei Features nebeneinander.
 *
 * Die Komposition liegt bewusst in `app`: Haushalte, Kategorien und Sicherung sollen
 * nichts voneinander wissen. Vorher lagen alle drei in einer Datei mit 413 Zeilen -
 * jede Aenderung an einem betraf alle.
 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Einstellungen" testId="settings-sheet" onClose={onClose}>
      <HouseholdSettings />
      <CategoryList />
      <BackupSection />

      <button
        type="button"
        className={controls.primary}
        data-testid="einstellungen-fertig"
        onClick={onClose}
      >
        Fertig
      </button>
    </Sheet>
  )
}
