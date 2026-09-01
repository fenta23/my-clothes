import type { Id } from '../../shared/db/ids.ts'
import type { HouseholdRef } from '../household/types.ts'

export interface ClothingItem {
  id: Id
  title: string
  categoryId: Id | null
  householdId: HouseholdRef
  createdAt: number
  updatedAt: number
}

/**
 * Bilder liegen getrennt von den Metadaten, damit Listenabfragen keine Fotos laden.
 *
 * Gespeichert wird als ArrayBuffer, nicht als Blob: WebKit lehnt das Schreiben von
 * Canvas-Blobs in IndexedDB mit "Error preparing Blob/File data to be stored in
 * object store" ab, waehrend Chromium sie klaglos annimmt. Der Fehler traete also
 * erst auf dem iPhone auf. ArrayBuffer ist ueberall zuverlaessig klonbar - auch in
 * fake-indexeddb, wodurch die Bildwege ueberhaupt testbar werden.
 */
export interface StoredImages {
  id: Id
  full: ArrayBuffer
  fullType: string
  thumb: ArrayBuffer
  thumbType: string
}

/** Nach aussen bleiben es Blobs - nur die Ablage arbeitet mit Puffern. */
export interface ItemImages {
  id: Id
  full: Blob
  thumb: Blob
}
