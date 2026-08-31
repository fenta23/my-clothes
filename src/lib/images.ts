/**
 * Bildaufbereitung beim Import.
 *
 * Die Groessenrechnung ist bewusst von der Canvas-Arbeit getrennt: so laesst sie sich
 * im Test pruefen, ohne einen Browser mit Canvas-Unterstuetzung zu brauchen.
 */

/** Lange Kante des gespeicherten Originals. */
export const FULL_MAX_EDGE = 1600

/**
 * Lange Kante des Vorschaubilds.
 *
 * Kein Nice-to-have: eine Bahn, die dreissig Fotos in voller Aufloesung scrollt,
 * ruckelt und laesst den Speicher volllaufen.
 */
export const THUMB_MAX_EDGE = 400

export const JPEG_QUALITY = 0.8

export interface Size {
  width: number
  height: number
}

/**
 * Skaliert eine Groesse so, dass die laengere Kante `maxEdge` nicht ueberschreitet.
 *
 * Vergroessert bewusst nie: ein kleines Foto wird durch Hochrechnen nicht besser,
 * nur groesser.
 */
export function fitWithin(size: Size, maxEdge: number): Size {
  const longest = Math.max(size.width, size.height)

  if (longest <= maxEdge || longest === 0) return { ...size }

  const factor = maxEdge / longest

  return {
    // Mindestens ein Pixel, sonst entsteht ein Canvas mit Breite 0.
    width: Math.max(1, Math.round(size.width * factor)),
    height: Math.max(1, Math.round(size.height * factor)),
  }
}

/** Zeichenflaeche, bevorzugt ausserhalb des Hauptthreads. */
function createCanvas(size: Size): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(size.width, size.height)
  }

  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  return canvas
}

function toBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas lieferte kein Bild'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Loest einen Blob von seiner Quelle und gibt ihn rein speicherbasiert zurueck.
 *
 * Notwendig, nicht kosmetisch: WebKit lehnt Blobs aus `convertToBlob` beim
 * Schreiben in IndexedDB mit "Error preparing Blob/File data to be stored in
 * object store" ab. Chromium speichert sie klaglos - der Fehler traete also
 * erst auf dem iPhone auf, also genau dort, wo die App laufen soll.
 */
async function detachBlob(blob: Blob): Promise<Blob> {
  return new Blob([await blob.arrayBuffer()], { type: blob.type })
}

/** Zeichnet die Bitmap in der gewuenschten Groesse und gibt sie als JPEG zurueck. */
async function renderScaled(bitmap: ImageBitmap, maxEdge: number): Promise<Blob> {
  const size = fitWithin({ width: bitmap.width, height: bitmap.height }, maxEdge)
  const canvas = createCanvas(size)

  const context = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null

  if (!context) throw new Error('2D-Kontext nicht verfuegbar')

  context.drawImage(bitmap, 0, 0, size.width, size.height)

  return detachBlob(await toBlob(canvas, JPEG_QUALITY))
}

export interface ProcessedImage {
  full: Blob
  thumb: Blob
  /** Masse des gespeicherten Originals - fuer die Anzeige beim Import. */
  size: Size
}

/**
 * Erzeugt aus einer ausgewaehlten Datei das gespeicherte Original und ein Vorschaubild.
 *
 * `imageOrientation: 'from-image'` ist entscheidend: iPhone-Fotos tragen ihre Drehung
 * in den EXIF-Daten. Ohne diese Option landen Hochformat-Aufnahmen liegend im Album.
 */
export async function processImageFile(file: Blob): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  try {
    const [full, thumb] = await Promise.all([
      renderScaled(bitmap, FULL_MAX_EDGE),
      renderScaled(bitmap, THUMB_MAX_EDGE),
    ])

    return { full, thumb, size: fitWithin(bitmap, FULL_MAX_EDGE) }
  } finally {
    // Ohne close() bleibt der dekodierte Speicher bis zur naechsten GC liegen.
    bitmap.close()
  }
}
