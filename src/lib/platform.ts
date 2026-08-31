/**
 * Erkennung der Laufzeitumgebung und Anforderung von dauerhaftem Speicher.
 *
 * Warum das ein eigenes Modul ist: die App verhaelt sich in Safari anders als in der
 * installierten Home-Screen-App, und der Unterschied entscheidet ueber die
 * Datenhaltbarkeit. Das gehoert an eine Stelle, nicht verstreut in Komponenten.
 */

/** iOS meldet den Standalone-Modus ueber eine eigene, nicht standardisierte Property. */
interface IosNavigator extends Navigator {
  standalone?: boolean
}

/**
 * Laeuft die App als installierte Home-Screen-App und nicht im Browser-Tab?
 *
 * Das ist die wichtigste Umgebungsfrage der App: nur installierte Web-Apps sind laut
 * WebKit von der 7-Tage-Loeschung des Speichers ausgenommen.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  if ((navigator as IosNavigator).standalone === true) return true

  return window.matchMedia?.('(display-mode: standalone)').matches ?? false
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false

  // iPadOS meldet sich seit Version 13 als Macintosh; der Touch-Support entlarvt es.
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return /iPad|iPhone|iPod/.test(navigator.userAgent) || isIpadOs
}

export interface PersistenceResult {
  /** Unterstuetzt der Browser die Storage-API ueberhaupt? */
  supported: boolean
  /** Ist der Speicher jetzt als dauerhaft markiert? */
  persisted: boolean
}

/**
 * Bittet den Browser, den Speicher dieser Origin dauerhaft zu behalten.
 *
 * Safari vergibt das nicht garantiert, deshalb wird das Ergebnis zurueckgegeben und
 * vom Aufrufer protokolliert - es ist eine Beobachtung, keine Zusicherung.
 */
export async function requestPersistentStorage(): Promise<PersistenceResult> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return { supported: false, persisted: false }
  }

  try {
    // Schon gewaehrt? Dann nicht erneut fragen.
    if (await navigator.storage.persisted?.()) {
      return { supported: true, persisted: true }
    }

    return { supported: true, persisted: await navigator.storage.persist() }
  } catch {
    return { supported: true, persisted: false }
  }
}

export interface StorageUsage {
  usageBytes: number
  quotaBytes: number
}

/** Belegter und verfuegbarer Speicher. `null`, wenn der Browser nichts meldet. */
export async function getStorageUsage(): Promise<StorageUsage | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null

  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (usage === undefined || quota === undefined) return null

    return { usageBytes: usage, quotaBytes: quota }
  } catch {
    return null
  }
}

/** Byte-Angabe fuer die Anzeige, z. B. "12,4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const decimals = value >= 100 ? 0 : 1

  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${units[unitIndex]}`
}
