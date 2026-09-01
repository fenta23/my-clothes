import { useState } from 'react'

import { IconMenu } from '../shared/ui/icons.ts'
import { useWardrobe } from '../store/StoreProvider.tsx'
import { selectStatus } from '../store/selectors.ts'
import { MainMenu } from './MainMenu.tsx'
import { Outfits } from './Outfits.tsx'
import { Wardrobe } from './Wardrobe.tsx'
import styles from './screen.module.css'

/**
 * Die Huelle um beide Bildschirme.
 *
 * Outfits liegen bewusst nicht im Seitenmenue: das traegt Nebenschauplaetze wie
 * Impressum und Einstellungen. Was taeglich gebraucht wird, gehoert gleichrangig
 * neben den Schrank - deshalb ein Umschalter in der Kopfzeile.
 *
 * Kopfzeile, Menue und der Zustand des Ladens liegen hier, damit beide Bildschirme
 * sie sich teilen statt sie nachzubauen.
 */
type Screen = 'schrank' | 'outfits'

export function Shell() {
  const status = useWardrobe(selectStatus)
  const [screen, setScreen] = useState<Screen>('schrank')
  const [menuOpen, setMenuOpen] = useState(false)

  if (status === 'fehler') {
    return (
      <div className={styles.screen}>
        <div className="appBackdrop" aria-hidden="true" />
        <p className={styles.error} data-testid="db-fehler">
          Die Datenbank konnte nicht geöffnet werden. Läuft die App im privaten Modus?
        </p>
      </div>
    )
  }

  if (status !== 'bereit') {
    return (
      <div className={styles.screen}>
        <div className="appBackdrop" aria-hidden="true" />
        <p className={styles.loading} data-testid="laedt">
          Kleiderschrank wird geöffnet…
        </p>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className="appBackdrop" aria-hidden="true" />

      <div className={styles.topBar} data-testid="kopfzeile">
        <div className={`glass glass--pill ${styles.switcher}`}>
          <Umschalter aktiv={screen} ziel="schrank" onWaehlen={setScreen}>
            Schrank
          </Umschalter>
          <Umschalter aktiv={screen} ziel="outfits" onWaehlen={setScreen}>
            Outfits
          </Umschalter>
        </div>

        <button
          type="button"
          className={`glass glass--pill ${styles.iconButton}`}
          aria-label="Menü"
          data-testid="menue-button"
          onClick={() => setMenuOpen(true)}
        >
          <IconMenu className="icon" aria-hidden="true" />
        </button>
      </div>

      {screen === 'schrank' ? <Wardrobe /> : <Outfits />}

      {menuOpen && <MainMenu onClose={() => setMenuOpen(false)} />}
    </div>
  )
}

function Umschalter({
  aktiv,
  ziel,
  onWaehlen,
  children,
}: {
  aktiv: Screen
  ziel: Screen
  onWaehlen: (screen: Screen) => void
  children: string
}) {
  const gewaehlt = aktiv === ziel

  return (
    <button
      type="button"
      className={`${styles.switch} ${gewaehlt ? styles.switchActive : ''}`}
      aria-pressed={gewaehlt}
      data-testid={`ansicht-${ziel}`}
      onClick={() => onWaehlen(ziel)}
    >
      {children}
    </button>
  )
}
