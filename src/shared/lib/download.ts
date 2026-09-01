/**
 * Bietet einen Blob als Datei zum Herunterladen an.
 *
 * Auf iOS landet die Datei ueber das Teilen-Blatt in „Dateien" oder iCloud - das
 * ist der einzige Weg, Daten aus einer Web-App herauszubekommen.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'

  document.body.append(link)
  link.click()
  link.remove()

  // Erst freigeben, wenn der Browser den Download begonnen hat.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
