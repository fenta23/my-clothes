import { useState } from 'react'

import { BackupSection } from '../features/backup/BackupSection.tsx'
import { CategoryList } from '../features/categories/CategoryList.tsx'
import { HouseholdSettings } from '../features/households/HouseholdSettings.tsx'
import { ImprintPanel } from '../features/legal/ImprintPanel.tsx'
import { PrivacyPanel } from '../features/legal/PrivacyPanel.tsx'
import { Drawer } from '../shared/ui/Drawer.tsx'
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

const ENTRIES: { view: Exclude<View, 'liste'>; icon: string; title: string; hint: string }[] = [
  {
    view: 'einstellungen',
    icon: '⚙︎',
    title: 'Einstellungen',
    hint: 'Haushalte, Kategorien und Sicherung',
  },
  {
    view: 'datenschutz',
    icon: '🔒',
    title: 'Datenschutz',
    hint: 'Was mit deinen Fotos passiert',
  },
  {
    view: 'impressum',
    icon: 'ℹ︎',
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
                <span className={styles.icon} aria-hidden="true">
                  {entry.icon}
                </span>
                <span className={styles.entryText}>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <span className={styles.entryHint}>{entry.hint}</span>
                </span>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
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
