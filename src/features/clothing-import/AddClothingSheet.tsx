import { useRef, useState } from 'react'

import { useWardrobe, useWardrobeStore } from '../../store/StoreProvider.tsx'
import { selectCategories, selectHouseholds } from '../../store/selectors.ts'
import type { HouseholdRef } from '../../entities/household/types.ts'
import type { Id } from '../../shared/db/ids.ts'
import { useObjectUrl } from '../../shared/lib/useObjectUrl.ts'
import { Sheet } from '../../shared/ui/Sheet.tsx'
import controls from '../../shared/ui/controls.module.css'
import styles from './AddClothingSheet.module.css'
import { processImageFile, type ProcessedImage } from './images.ts'

/*
 * Die Reihenfolge ist Absicht: erst das Foto, dann die Angaben.
 *
 * Auf iOS kann der Kamera-Picker die Seite neu laden. Passiert das, ist die
 * Dateiauswahl ohnehin verloren - kein Entwurf der Welt holt sie zurueck. Wer zuerst
 * fotografiert, verliert im schlimmsten Fall ein leeres Formular. Wer zuerst tippt,
 * verliert seine Eingaben.
 */

const NEW_CATEGORY_COLORS = ['#4F7CFF', '#EC4899', '#22C55E', '#F59E0B', '#8B5CF6']

export function AddClothingSheet({ onClose }: { onClose: () => void }) {
  const households = useWardrobe(selectHouseholds)
  const categories = useWardrobe(selectCategories)
  const store = useWardrobeStore()

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
    } catch (cause) {
      // Ursache protokollieren: ein verschluckter Fehler kostete zuvor eine halbe
      // Stunde Suche in einem Browser, der sich anders verhaelt.
      console.error('[Import] Bildverarbeitung fehlgeschlagen', cause)
      setError('Das Bild konnte nicht verarbeitet werden. Bitte noch einmal versuchen.')
    } finally {
      setBusy(false)
    }
  }

  async function handleNewCategory() {
    const name = newCategoryName.trim()
    if (!name) return

    const colorHex = NEW_CATEGORY_COLORS[categories.length % NEW_CATEGORY_COLORS.length]!
    await store.addCategory({ name, emoji: '🏷️', colorHex })
    setNewCategoryName('')
  }

  async function handleSave() {
    if (!image) return

    setBusy(true)
    setError(null)

    try {
      await store.addItem({
        title,
        categoryId,
        householdId: target,
        full: image.full,
        thumb: image.thumb,
      })
      onClose()
    } catch (cause) {
      console.error('[Import] Speichern fehlgeschlagen', cause)
      setError('Speichern fehlgeschlagen.')
      setBusy(false)
    }
  }

  return (
    <Sheet label="Kleidungsstück hinzufügen" testId="add-sheet" onClose={onClose}>
      <h2 className={styles.title}>Neues Kleidungsstück</h2>

      {!image ? (
        <>
          <p className={styles.step} data-testid="schritt-foto">
            Schritt 1 — Foto
          </p>

          <div className={styles.sourceButtons}>
            <button
              type="button"
              className={styles.sourceButton}
              onClick={() => cameraRef.current?.click()}
              data-testid="foto-aufnehmen"
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
              data-testid="aus-galerie"
            >
              <span className={styles.sourceIcon} aria-hidden="true">
                🖼️
              </span>
              Aus Galerie
            </button>
          </div>

          {busy && (
            <p className={styles.busy} data-testid="verarbeitet">
              Bild wird verarbeitet…
            </p>
          )}
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
                data-testid="vorschau"
              />
            )}
          </div>

          <button
            type="button"
            className={controls.secondary}
            onClick={() => setImage(null)}
            data-testid="anderes-foto"
          >
            Anderes Foto
          </button>

          <div className={controls.field}>
            <label className={controls.label} htmlFor="titel">
              Name (optional)
            </label>
            <input
              id="titel"
              className={controls.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Lieblingshose"
              data-testid="titel-eingabe"
            />
          </div>

          <div className={controls.field}>
            <span className={controls.label}>Kategorie</span>
            <div className={controls.chips}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={categoryId === category.id}
                  className={`${controls.chip} ${
                    categoryId === category.id ? controls.chipActive : ''
                  }`}
                  onClick={() =>
                    setCategoryId((current) => (current === category.id ? null : category.id))
                  }
                  data-testid="kategorie-chip"
                  data-category={category.name}
                >
                  <span aria-hidden="true">{category.emoji}</span>
                  {category.name}
                </button>
              ))}
            </div>

            <div className={styles.newCategoryRow}>
              <input
                className={controls.input}
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Neue Kategorie…"
                aria-label="Neue Kategorie"
                data-testid="neue-kategorie-eingabe"
              />
              <button
                type="button"
                className={controls.secondary}
                disabled={newCategoryName.trim() === ''}
                onClick={() => void handleNewCategory()}
                data-testid="kategorie-anlegen"
              >
                Anlegen
              </button>
            </div>
          </div>

          <div className={controls.field}>
            <span className={controls.label}>Wo ist es gerade?</span>
            <div className={controls.chips}>
              <button
                type="button"
                aria-pressed={target === null}
                className={`${controls.chip} ${target === null ? controls.chipActive : ''}`}
                onClick={() => setTarget(null)}
                data-testid="ziel-chip"
                data-target="inbox"
              >
                Noch offen
              </button>

              {households.map((household) => (
                <button
                  key={household.id}
                  type="button"
                  aria-pressed={target === household.id}
                  className={`${controls.chip} ${
                    target === household.id ? controls.chipActive : ''
                  }`}
                  onClick={() => setTarget(household.id)}
                  data-testid="ziel-chip"
                  data-target={household.name}
                >
                  {household.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={controls.secondary}
              onClick={onClose}
              data-testid="abbrechen"
            >
              Abbrechen
            </button>
            <button
              type="button"
              className={controls.primary}
              disabled={busy}
              onClick={() => void handleSave()}
              data-testid="speichern"
            >
              {busy ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className={styles.error} data-testid="fehler">
          {error}
        </p>
      )}

      <input
        ref={cameraRef}
        className={controls.hiddenInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void handleFile(event)}
        data-testid="kamera-input"
      />
      <input
        ref={galleryRef}
        className={controls.hiddenInput}
        type="file"
        accept="image/*"
        onChange={(event) => void handleFile(event)}
        data-testid="galerie-input"
      />
    </Sheet>
  )
}
