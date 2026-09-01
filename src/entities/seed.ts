import type { Db } from './db.ts'
import { DEFAULT_CATEGORIES } from './category/defaults.ts'
import { newCategory } from './category/repository.ts'
import { DEFAULT_HOUSEHOLD_NAMES } from './household/defaults.ts'
import { newHousehold } from './household/repository.ts'

/**
 * Legt Haushalte und Startkategorien an, falls die Datenbank leer ist.
 *
 * Pruefung und Anlegen liegen zwingend in EINER Transaktion.
 *
 * React fuehrt Effekte im StrictMode doppelt aus, und zwar ueberlappend: beide Laeufe
 * fragen "ist die Datenbank leer?", bevor einer geschrieben hat - und beide legen an.
 * Ergebnis waren vier Haushalte und jede Kategorie doppelt. Getrennte Aufrufe zu
 * zaehlen und danach zu schreiben reicht deshalb nicht; IndexedDB serialisiert aber
 * Schreibtransaktionen mit gleichem Geltungsbereich, sodass die zweite Transaktion
 * die Eintraege der ersten sieht.
 */
export async function seedIfEmpty(db: Db, at = Date.now()): Promise<void> {
  const tx = db.transaction(['households', 'categories'], 'readwrite')

  if ((await tx.objectStore('households').count()) > 0) {
    await tx.done
    return
  }

  await Promise.all([
    ...DEFAULT_HOUSEHOLD_NAMES.map((name, position) =>
      tx.objectStore('households').add(newHousehold(name, position, at)),
    ),
    ...DEFAULT_CATEGORIES.map((seed, index) =>
      tx.objectStore('categories').add(newCategory({ ...seed, sortOrder: index }, at)),
    ),
    tx.done,
  ])
}
