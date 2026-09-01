import { useRef, useState } from 'react'

import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import { selectItems } from '../../store/selectors.ts'
import { downloadBlob } from '../../shared/lib/download.ts'
import controls from '../../shared/ui/controls.module.css'
import { BackupError, backupFileName, exportBackup, importBackup } from './backup.ts'
import styles from './BackupSection.module.css'

/**
 * Sicherung als ZIP.
 *
 * Steht bewusst mit einem erklaerenden Satz da: ohne Sync ist das der einzige Weg,
 * die Fotos zu retten, wenn der Browser aufraeumt, die Adresse wechselt oder das
 * Geraet verloren geht.
 */
export function BackupSection() {
  const items = useWardrobe(selectItems)
  const store = useWardrobeStore()

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setBusy(true)
    setStatus(null)

    try {
      downloadBlob(await exportBackup(store.requireDb()), backupFileName())
      setStatus({ text: 'Sicherung erstellt.', error: false })
    } catch (cause) {
      console.error('[Sicherung] Export fehlgeschlagen', cause)
      setStatus({ text: 'Die Sicherung konnte nicht erstellt werden.', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    setStatus(null)
    setConfirming(false)

    try {
      const archive = new Uint8Array(await file.arrayBuffer())
      const result = await importBackup(store.requireDb(), archive)
      await store.reloadAll()

      setStatus({
        text: `${result.items} ${result.items === 1 ? 'Stück' : 'Stücke'} wiederhergestellt.`,
        error: false,
      })
    } catch (cause) {
      console.error('[Sicherung] Import fehlgeschlagen', cause)
      setStatus({
        text:
          cause instanceof BackupError
            ? cause.message
            : 'Die Sicherung konnte nicht gelesen werden.',
        error: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={controls.field} data-testid="sicherung">
      <h2 className={controls.sectionTitle}>Sicherung</h2>

      <p className={controls.hint}>
        Alle Fotos liegen nur auf diesem Gerät. Räumt der Browser auf oder geht das Gerät
        verloren, sind sie weg. Lade dir ab und zu eine Sicherung herunter.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          data-testid="sicherung-export"
          onClick={() => void handleExport()}
        >
          {items.length === 0 ? 'Exportieren' : `Exportieren (${items.length})`}
        </button>

        <button
          type="button"
          className={styles.button}
          disabled={busy}
          data-testid="sicherung-import"
          onClick={() => setConfirming(true)}
        >
          Wiederherstellen
        </button>
      </div>

      {confirming && (
        <div className={controls.confirm} data-testid="sicherung-bestaetigung">
          <span>
            Wiederherstellen ersetzt den gesamten Inhalt dieser App. Alles, was jetzt hier
            liegt, wird durch die Sicherung überschrieben.
          </span>

          <div className={controls.confirmActions}>
            <button
              type="button"
              className={controls.secondary}
              data-testid="sicherung-abbrechen"
              onClick={() => setConfirming(false)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className={controls.primary}
              data-testid="sicherung-datei-waehlen"
              onClick={() => fileRef.current?.click()}
            >
              Datei wählen
            </button>
          </div>
        </div>
      )}

      {status && (
        <p
          className={`${styles.status} ${status.error ? styles.statusError : ''}`}
          data-testid="sicherung-status"
        >
          {status.text}
        </p>
      )}

      <input
        ref={fileRef}
        className={controls.hiddenInput}
        type="file"
        accept=".zip,application/zip"
        data-testid="sicherung-datei"
        onChange={(event) => void handleFile(event)}
      />
    </section>
  )
}
