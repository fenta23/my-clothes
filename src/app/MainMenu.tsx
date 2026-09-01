import { useState } from 'react'

import { BackupSection } from '../features/backup/BackupSection.tsx'
import { CategoryList } from '../features/categories/CategoryList.tsx'
import { HouseholdSettings } from '../features/households/HouseholdSettings.tsx'
import { ImprintPanel } from '../features/legal/ImprintPanel.tsx'
import { PrivacyPanel } from '../features/legal/PrivacyPanel.tsx'
import { Drawer } from '../shared/ui/Drawer.tsx'
import {
  IconForward,
  IconImprint,
  IconPrivacy,
  IconSettings,
} from '../shared/ui/icons.ts'
import styles from './MainMenu.module.css'

/**
 * Die Seitenleiste mit allem, was nicht zum taeglichen Gebrauch gehoert.
 *
 * Statt Blaetter uebereinander zu stapeln, navigiert die Leiste in sich selbst: von
 * der Liste in einen Bereich und mit dem Pfeil zurueck. Auf einem Telefon ist ein
 * gestapeltes Schliessen schwer zu treffen und noch schwerer zu verstehen.
 *
 * Die Komposition liegt in `app`, weil hier vier Features nebeneinanderstehen -
 * Haushalte, Kategorien, Sicherung und Rechtliches sollen einander nicht kennen.
 */
type View = 'liste' | 'einstellungen' | 'datenschutz' | 'impressum'

const TITLES: Record<View, string> = {
  liste: 'Menü',
  einstellungen: 'Einstellungen',
  datenschutz: 'Datenschutz',
  impressum: 'Impressum',
}

interface MenuEntry {
  view: Exclude<View, 'liste'>
  Icon: typeof IconSettings
  title: string
  hint: string
}

const ENTRIES: MenuEntry[] = [
  {
    view: 'einstellungen',
    Icon: IconSettings,
    title: 'Einstellungen',
    hint: 'Haushalte, Kategorien und Sicherung',
  },
  {
    view: 'datenschutz',
    Icon: IconPrivacy,
    title: 'Datenschutz',
    hint: 'Was mit deinen Fotos passiert',
  },
  {
    view: 'impressum',
    Icon: IconImprint,
    title: 'Impressum',
    hint: 'Wer diese App betreibt',
  },
]

export function MainMenu({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('liste')

  return (
    <Drawer
      title={TITLES[view]}
      testId="hauptmenue"
      onClose={onClose}
      onBack={view === 'liste' ? undefined : () => setView('liste')}
    >
      {view === 'liste' && (
        <>
          <div className={styles.entries}>
            {ENTRIES.map((entry) => (
              <button
                key={entry.view}
                type="button"
                className={styles.entry}
                data-testid="menue-eintrag"
                data-view={entry.view}
                onClick={() => setView(entry.view)}
              >
                <entry.Icon className={`icon icon--lg ${styles.icon}`} aria-hidden="true" />
                <span className={styles.entryText}>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <span className={styles.entryHint}>{entry.hint}</span>
                </span>
                <IconForward className={`icon ${styles.chevron}`} aria-hidden="true" />
              </button>
            ))}
          </div>

          <p className={styles.footer}>
            Kleiderschrank — alle Fotos bleiben auf diesem Gerät. Es gibt keinen Server
            und kein Konto.
          </p>
        </>
      )}

      {/* Die Kennung bleibt `settings-sheet`, damit die bestehenden Tests weiter
          dasselbe ansprechen wie zuvor. */}
      {view === 'einstellungen' && (
        <div data-testid="settings-sheet">
          <HouseholdSettings />
          <CategoryList />
          <BackupSection />
        </div>
      )}

      {view === 'datenschutz' && <PrivacyPanel />}
      {view === 'impressum' && <ImprintPanel />}
    </Drawer>
  )
}
