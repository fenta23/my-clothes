import { openClothesDB, type Db } from './db.ts'

/**
 * Frische Datenbank je Test.
 *
 * Ein eigener Name pro Aufruf, damit sich Faelle nicht gegenseitig sehen - das ist
 * billiger und verlaesslicher, als zwischen Tests aufzuraeumen.
 */
let counter = 0

export function freshDb(prefix = 'test'): Promise<Db> {
  counter += 1

  return openClothesDB(`${prefix}-${counter}`)
}

/** Kleines Bild-Ersatzstueck fuer Tests. */
export const testBlob = (text: string) => new Blob([text], { type: 'image/jpeg' })
