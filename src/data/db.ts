import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type {
  Category,
  ClothingItem,
  Household,
  ItemEvent,
  StoredImages,
} from './types.ts'

/**
 * IndexedDB-Schema.
 *
 * Bilder liegen in einem eigenen Store: eine Bahn, die dreissig Kleidungsstuecke
 * anzeigt, soll dreissig Metadatensaetze laden und nicht dreissig Fotos.
 */
export interface ClothesDB extends DBSchema {
  households: {
    key: string
    value: Household
    indexes: { 'by-position': number }
  }
  categories: {
    key: string
    value: Category
    indexes: { 'by-sortOrder': number }
  }
  items: {
    key: string
    value: ClothingItem
    indexes: { 'by-household': string; 'by-category': string }
  }
  events: {
    key: string
    value: ItemEvent
    indexes: { 'by-item': string; 'by-timestamp': number }
  }
  images: {
    key: string
    value: StoredImages
  }
}

export const DB_NAME = 'kleiderschrank'
export const DB_VERSION = 2

/**
 * Oeffnet die Datenbank und legt beim ersten Mal alle Stores an.
 *
 * Hinweis zu `by-household`: IndexedDB indiziert `null` nicht. Eintraege der mittleren
 * Bahn tauchen im Index also bewusst nicht auf - sie werden ueber einen vollen Scan
 * geholt. Bei der erwarteten Datenmenge ist das billiger als ein Ersatzschluessel.
 */
export function openClothesDB(name = DB_NAME): Promise<IDBPDatabase<ClothesDB>> {
  return openDB<ClothesDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion >= 1) {
        // Version 2 legt Bilder als ArrayBuffer statt als Blob ab. Alte Eintraege
        // liessen sich nicht mehr anzeigen, also werden sie verworfen statt eine
        // halb kaputte Anzeige zu erzeugen. Betrifft nur Teststaende.
        db.deleteObjectStore('images')
        db.createObjectStore('images', { keyPath: 'id' })
        return
      }

      const households = db.createObjectStore('households', { keyPath: 'id' })
      households.createIndex('by-position', 'position')

      const categories = db.createObjectStore('categories', { keyPath: 'id' })
      categories.createIndex('by-sortOrder', 'sortOrder')

      const items = db.createObjectStore('items', { keyPath: 'id' })
      items.createIndex('by-household', 'householdId')
      items.createIndex('by-category', 'categoryId')

      const events = db.createObjectStore('events', { keyPath: 'id' })
      events.createIndex('by-item', 'itemId')
      events.createIndex('by-timestamp', 'timestamp')

      db.createObjectStore('images', { keyPath: 'id' })
    },
  })
}
