import { openDB, type IDBPDatabase } from 'idb'

import { openClothesDB, upgradeClothesDB, type ClothesDB, type Db } from './db.ts'

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

/**
 * Oeffnet eine Datenbank auf einer ausdruecklich gewaehlten Version.
 *
 * Nur fuer Migrationstests: `freshDb` verdrahtet die aktuelle `DB_VERSION`, damit
 * laesst sich ein Versionssprung nicht pruefen, sondern nur behaupten.
 *
 * Bewusst ohne Schema-Typ - ein alter Stand hat das heutige Schema ja gerade noch
 * nicht. Ein `Db` hier wuerde Stores versprechen, die es noch gar nicht gibt.
 */
export function openAtVersion(name: string, version: number): Promise<IDBPDatabase> {
  return openDB(name, version, {
    upgrade: (db, oldVersion, newVersion) =>
      upgradeClothesDB(db as unknown as IDBPDatabase<ClothesDB>, oldVersion, newVersion ?? version),
  })
}

/** Kleines Bild-Ersatzstueck fuer Tests. */
export const testBlob = (text: string) => new Blob([text], { type: 'image/jpeg' })
