import { useRef, useState } from 'react'

import { useClothes } from '../data/ClothesProvider.tsx'
import type { HouseholdRef, Id } from '../data/types.ts'
import { processImageFile, type ProcessedImage } from '../lib/images.ts'
import { useObjectUrl } from '../lib/useObjectUrl.ts'
import styles from './AddClothingSheet.module.css'

/*
 * Die Reihenfolge ist Absicht: erst das Foto, dann die Angaben.
 *
 * Auf iOS kann der Kamera-Picker die Seite neu laden. Passiert das, ist die
 * Dateiauswahl ohnehin verloren - kein Entwurf der Welt holt sie zurueck. Wer
 * zuerst fotografiert, verliert im schlimmsten Fall ein leeres Formular. Wer
 * zuerst tippt, verliert seine Eingaben.
 */

const NEW_CATEGORY_COLORS = ['#4F7CFF', '#EC4899', '#22C55E', '#F59E0B', '#8B5CF6']

export function AddClothingSheet({ onClose }: { onClose: () => void }) {
  const { households, categories, addItem, addCategory } = useClothes()

  const [image, setImage] = useState<ProcessedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<Id | null>(null)
  const [target, setTarget] = useState<HouseholdRef>(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const previewUrl = useObjectUrl(image?.thumb)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Zuruecksetzen, damit dieselbe Datei erneut ausgewaehlt werden kann.
    event.target.value = ''
    if (!file) return

    setBusy(true)
    setError(null)

    try {
      setImage(await processImageFile(file))
    } catch {
      setError('Das Bild konnte nicht verarbeitet werden. Bitte noch einmal versuchen.')
    } finally {
      setBusy(false)
    }
  }

  async function handleNewCategory() {
    const name = newCategoryName.trim()
    if (!name) return

    const colorHex = NEW_CATEGORY_COLORS[categories.length % NEW_CATEGORY_COLORS.length]!
    await addCategory({ name, emoji: '🏷️', colorHex })
    setNewCategoryName('')
  }

  async function handleSave() {
    if (!image) return

    setBusy(true)
    setError(null)

    try {
      await addItem({
        title,
        categoryId,
        householdId: target,
        full: image.full,
        thumb: image.thumb,
      })
      onClose()
    } catch {
      setError('Speichern fehlgeschlagen.')
      setBusy(false)
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`glass glass--strong ${styles.sheet}`}
        role="dialog"
        aria-modal="true"
        aria-label="Kleidungsstück hinzufügen"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.grabber} />
        <h2 className={styles.title}>Neues Kleidungsstück</h2>

        {!image ? (
          <>
            <p className={styles.step}>Schritt 1 — Foto</p>

            <div className={styles.sourceButtons}>
              <button
                type="button"
                className={styles.sourceButton}
                onClick={() => cameraRef.current?.click()}
              >
                <span className={styles.sourceIcon} aria-hidden="true">
                  📷
                </span>
                Foto aufnehmen
              </button>

              <button
                type="button"
                className={styles.sourceButton}
                onClick={() => galleryRef.current?.click()}
              >
                <span className={styles.sourceIcon} aria-hidden="true">
                  🖼️
                </span>
                Aus Galerie
              </button>
            </div>

            {busy && <p className={styles.busy}>Bild wird verarbeitet…</p>}
          </>
        ) : (
          <>
            <div className={styles.preview}>
              {previewUrl && (
                <img
                  className={styles.previewImage}
                  src={previewUrl}
                  alt="Vorschau des aufgenommenen Kleidungsstücks"
                  draggable={false}
                />
              )}
            </div>

            <button
              type="button"
              className={styles.secondary}
              onClick={() => setImage(null)}
            >
              Anderes Foto
            </button>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="titel">
                Name (optional)
              </label>
              <input
                id="titel"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Lieblingshose"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Kategorie</span>
              <div className={styles.chips}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={categoryId === category.id}
                    className={`${styles.chip} ${
                      categoryId === category.id ? styles.chipActive : ''
                    }`}
                    onClick={() =>
                      setCategoryId((current) =>
                        current === category.id ? null : category.id,
                      )
                    }
                  >
                    <span aria-hidden="true">{category.emoji}</span>
                    {category.name}
                  </button>
                ))}
              </div>

              <div className={styles.newCategoryRow}>
                <input
                  className={styles.input}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Neue Kategorie…"
                  aria-label="Neue Kategorie"
                />
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={newCategoryName.trim() === ''}
                  onClick={() => void handleNewCategory()}
                >
                  Anlegen
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Wo ist es gerade?</span>
              <div className={styles.chips}>
                <button
                  type="button"
                  aria-pressed={target === null}
                  className={`${styles.chip} ${target === null ? styles.chipActive : ''}`}
                  onClick={() => setTarget(null)}
                >
                  Noch offen
                </button>

                {households.map((household) => (
                  <button
                    key={household.id}
                    type="button"
                    aria-pressed={target === household.id}
                    className={`${styles.chip} ${
                      target === household.id ? styles.chipActive : ''
                    }`}
                    onClick={() => setTarget(household.id)}
                  >
                    {household.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={onClose}>
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() => void handleSave()}
              >
                {busy ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <input
          ref={cameraRef}
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleFile(e)}
          data-testid="kamera-input"
        />
        <input
          ref={galleryRef}
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          onChange={(e) => void handleFile(e)}
          data-testid="galerie-input"
        />
      </div>
    </div>
  )
}
