import { useEffect, useState } from 'react'

import styles from './App.module.css'
import {
  formatBytes,
  getStorageUsage,
  isIos,
  isStandalone,
  requestPersistentStorage,
  type PersistenceResult,
  type StorageUsage,
} from './lib/platform.ts'

/**
 * Systemcheck fuer das Grundgeruest.
 *
 * Der Bildschirm beantwortet die Fragen, die sich nur auf dem echten Geraet klaeren
 * lassen: Laeuft die App installiert? Haelt Safari den Speicher fest? Wirkt das Glas?
 * Er wird in Schritt 5 durch die eigentlichen Bahnen ersetzt.
 */
export function App() {
  const [standalone, setStandalone] = useState(false)
  const [ios, setIos] = useState(false)
  const [persistence, setPersistence] = useState<PersistenceResult | null>(null)
  const [usage, setUsage] = useState<StorageUsage | null>(null)

  useEffect(() => {
    setStandalone(isStandalone())
    setIos(isIos())

    void (async () => {
      const result = await requestPersistentStorage()
      setPersistence(result)

      // Safaris Vergabe ist nicht garantiert - deshalb protokollieren wir, was
      // tatsaechlich passiert ist, statt es anzunehmen.
      console.info('[Speicher] dauerhaft:', result)

      setUsage(await getStorageUsage())
    })()
  }, [])

  return (
    <div className={styles.screen}>
      <div className="appBackdrop" aria-hidden="true" />

      <header>
        <h1 className={styles.title}>Kleiderschrank</h1>
        <p className={styles.subtitle}>Grundgeruest steht. Systemcheck:</p>
      </header>

      <section className={`glass glass--lg ${styles.card}`}>
        <h2 className={styles.cardTitle}>Umgebung</h2>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Installiert (Home-Bildschirm)</span>
          <span className={`${styles.rowValue} ${standalone ? styles.ok : styles.warn}`}>
            {standalone ? 'ja' : 'nein — im Browser'}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.rowLabel}>iOS</span>
          <span className={styles.rowValue}>{ios ? 'ja' : 'nein'}</span>
        </div>

        {!standalone && (
          <p className={styles.hint}>
            Nur als installierte App ist der Speicher von Safaris 7-Tage-Loeschung
            ausgenommen. Zum Testen ueber „Teilen → Zum Home-Bildschirm" hinzufuegen.
          </p>
        )}
      </section>

      <section className={`glass glass--lg ${styles.card}`}>
        <h2 className={styles.cardTitle}>Speicher</h2>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Dauerhaft angefordert</span>
          <span className={styles.rowValue}>
            {persistence === null
              ? '…'
              : !persistence.supported
                ? 'nicht unterstuetzt'
                : persistence.persisted
                  ? 'gewaehrt'
                  : 'abgelehnt'}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Belegt / verfuegbar</span>
          <span className={styles.rowValue}>
            {usage
              ? `${formatBytes(usage.usageBytes)} / ${formatBytes(usage.quotaBytes)}`
              : 'unbekannt'}
          </span>
        </div>
      </section>

      <section className={`glass glass--lg ${styles.card}`}>
        <h2 className={styles.cardTitle}>Glas-Material</h2>

        <div className={styles.pills}>
          <span className={`glass glass--pill ${styles.pill}`}>Hose</span>
          <span className={`glass glass--pill glass--strong ${styles.pill}`}>Kleid</span>
          <span className={`glass glass--pill ${styles.pill}`}>T-Shirt</span>
        </div>

        <p className={styles.hint}>
          Wenn die Pillen den farbigen Hintergrund weichgezeichnet durchscheinen lassen,
          greift <code>backdrop-filter</code>. Sonst hat der Fallback uebernommen.
        </p>
      </section>
    </div>
  )
}
