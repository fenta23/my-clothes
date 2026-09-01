import { unzipSync, zipSync } from 'fflate'

import { listCategories } from '../../entities/category/repository.ts'
import type { Category } from '../../entities/category/types.ts'
import { listItems } from '../../entities/clothing/repository.ts'
import type { ClothingItem } from '../../entities/clothing/types.ts'
import type { Db } from '../../entities/db.ts'
import { listAllEvents } from '../../entities/event/repository.ts'
import type { ItemEvent } from '../../entities/event/types.ts'
import { listHouseholds } from '../../entities/household/repository.ts'
import type { Household } from '../../entities/household/types.ts'

/**
 * Sicherung und Wiederherstellung als ZIP.
 *
 * Warum das kein Zusatz ist, sondern zum Kern gehoert: es gibt keinen Sync, und die
 * Daten haengen am Origin. Wechselt die Adresse, raeumt der Browser den Speicher auf
 * oder geht das Geraet verloren, ist ohne Export alles weg. Das hier ist der einzige
 * Rettungsweg.
 *
 * Aufbau des Archivs:
 *   daten.json      alle Datensaetze ohne Bilder
 *   bilder/<id>.jpg Originalfoto
 *   bilder/<id>.thumb.jpg Vorschaubild
 *
 * Die Bilder liegen als eigene Dateien und nicht als Base64 in der JSON: das haelt
 * das Archiv rund ein Drittel kleiner und macht es mit jedem Packprogramm lesbar.
 */

export const BACKUP_FORMAT = 1

export interface BackupData {
  format: number
  createdAt: number
  households: Household[]
  categories: Category[]
  items: ClothingItem[]
  events: ItemEvent[]
}

const DATA_ENTRY = 'daten.json'
const IMAGE_DIR = 'bilder/'

function fullName(id: string): string {
  return `${IMAGE_DIR}${id}.jpg`
}

function thumbName(id: string): string {
  return `${IMAGE_DIR}${id}.thumb.jpg`
}

/** Packt den gesamten Bestand in ein ZIP. */
export async function exportBackup(db: Db, at = Date.now()): Promise<Blob> {
  const [households, categories, items, events] = await Promise.all([
    listHouseholds(db),
    listCategories(db),
    listItems(db),
    listAllEvents(db),
  ])

  const data: BackupData = {
    format: BACKUP_FORMAT,
    createdAt: at,
    households,
    categories,
    items,
    events,
  }

  const files: Record<string, Uint8Array> = {
    [DATA_ENTRY]: new TextEncoder().encode(JSON.stringify(data, null, 2)),
  }

  for (const item of items) {
    const stored = await db.get('images', item.id)
    if (!stored) continue

    files[fullName(item.id)] = new Uint8Array(stored.full)
    files[thumbName(item.id)] = new Uint8Array(stored.thumb)
  }

  // Fotos sind bereits JPEG - erneutes Packen braucht Zeit und bringt nichts.
  const zipped = zipSync(files, { level: 0 })

  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}

export class BackupError extends Error {}

/** Liest ein Archiv und prueft es, bevor irgendetwas geschrieben wird. */
export function readBackup(archive: Uint8Array): {
  data: BackupData
  images: Map<string, { full: Uint8Array; thumb: Uint8Array }>
} {
  let files: Record<string, Uint8Array>

  try {
    files = unzipSync(archive)
  } catch {
    throw new BackupError('Die Datei ist kein lesbares ZIP-Archiv.')
  }

  const raw = files[DATA_ENTRY]
  if (!raw) throw new BackupError('Im Archiv fehlt daten.json — das ist keine Sicherung.')

  let data: BackupData
  try {
    data = JSON.parse(new TextDecoder().decode(raw)) as BackupData
  } catch {
    throw new BackupError('Die Daten im Archiv sind beschädigt.')
  }

  if (data.format !== BACKUP_FORMAT) {
    throw new BackupError(
      `Die Sicherung hat Format ${String(data.format)}, erwartet wird ${BACKUP_FORMAT}.`,
    )
  }

  if (!Array.isArray(data.items) || !Array.isArray(data.households)) {
    throw new BackupError('Die Sicherung ist unvollständig.')
  }

  const images = new Map<string, { full: Uint8Array; thumb: Uint8Array }>()

  for (const item of data.items) {
    const full = files[fullName(item.id)]
    const thumb = files[thumbName(item.id)]
    // Ein Stueck ohne Bild ist zwar unvollstaendig, aber kein Grund, die ganze
    // Wiederherstellung abzubrechen - der Rest ist mehr wert als nichts.
    if (full && thumb) images.set(item.id, { full, thumb })
  }

  return { data, images }
}

/**
 * Ersetzt den gesamten Bestand durch den Inhalt einer Sicherung.
 *
 * Bewusst ersetzen statt zusammenfuehren: beim Zusammenfuehren muesste man
 * entscheiden, welche Fassung eines Kleidungsstuecks gewinnt - eine Frage, die
 * niemand beantworten kann und die stillschweigend Daten verfaelscht.
 */
export async function importBackup(
  db: Db,
  archive: Uint8Array,
): Promise<{ items: number; images: number }> {
  const { data, images } = readBackup(archive)

  const tx = db.transaction(
    ['households', 'categories', 'items', 'events', 'images'],
    'readwrite',
  )

  await Promise.all([
    tx.objectStore('households').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('items').clear(),
    tx.objectStore('events').clear(),
    tx.objectStore('images').clear(),
  ])

  await Promise.all([
    ...data.households.map((h) => tx.objectStore('households').put(h)),
    ...data.categories.map((c) => tx.objectStore('categories').put(c)),
    ...data.items.map((i) => tx.objectStore('items').put(i)),
    ...(data.events ?? []).map((e) => tx.objectStore('events').put(e)),
    ...[...images].map(([id, { full, thumb }]) =>
      tx.objectStore('images').put({
        id,
        // In einen eigenen Puffer kopieren: die Sicht aus fflate zeigt in einen
        // groesseren gemeinsamen Speicherbereich und wuerde das ganze Archiv
        // mitschleppen.
        full: full.slice().buffer,
        fullType: 'image/jpeg',
        thumb: thumb.slice().buffer,
        thumbType: 'image/jpeg',
      }),
    ),
    tx.done,
  ])

  return { items: data.items.length, images: images.size }
}

/** Dateiname mit Datum, damit mehrere Sicherungen nebeneinander liegen koennen. */
export function backupFileName(at = Date.now()): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')

  return `kleiderschrank-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.zip`
}
