import type { IDBPDatabase } from 'idb'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import * as backup from './backup.ts'
import { openClothesDB, type ClothesDB } from './db.ts'
import * as repo from './repository.ts'
import type {
  Category,
  ClothingItem,
  Household,
  HouseholdRef,
  Id,
  ItemEvent,
  ItemImages,
} from './types.ts'

/**
 * Haelt den geladenen Datenbestand und buendelt alle Schreibzugriffe.
 *
 * Nach jedem Schreiben wird neu gelesen statt der Zustand von Hand nachgefuehrt.
 * Bei der erwarteten Datenmenge - ein Kinderkleiderschrank, keine Lagerverwaltung -
 * ist das unauffaellig schnell und schliesst eine ganze Klasse von Fehlern aus,
 * bei denen Anzeige und Datenbank auseinanderlaufen.
 */

export interface ClothesContextValue {
  ready: boolean
  error: Error | null

  households: Household[]
  categories: Category[]
  items: ClothingItem[]

  addItem: (input: repo.CreateItemInput) => Promise<ClothingItem>
  moveItem: (itemId: Id, target: HouseholdRef) => Promise<void>
  setItemCategory: (itemId: Id, categoryId: Id | null) => Promise<void>
  renameItem: (itemId: Id, title: string) => Promise<void>
  deleteItem: (itemId: Id) => Promise<void>

  addCategory: (input: { name: string; emoji: string; colorHex: string }) => Promise<void>
  updateCategory: (
    id: Id,
    patch: Partial<Pick<Category, 'name' | 'emoji' | 'colorHex' | 'sortOrder'>>,
  ) => Promise<void>
  deleteCategory: (id: Id) => Promise<number>
  moveCategory: (id: Id, direction: 'up' | 'down') => Promise<void>
  /** Anzahl Kleidungsstuecke je Kategorie - fuer die Warnung vor dem Loeschen. */
  itemsPerCategory: Map<Id, number>

  renameHousehold: (id: Id, name: string) => Promise<void>

  /** Packt den gesamten Bestand in ein ZIP. */
  exportBackup: () => Promise<Blob>
  /** Ersetzt den Bestand durch den Inhalt einer Sicherung. */
  importBackup: (archive: Uint8Array) => Promise<{ items: number; images: number }>

  loadImages: (itemId: Id) => Promise<ItemImages | undefined>
  listEvents: (itemId: Id) => Promise<ItemEvent[]>
}

const ClothesContext = createContext<ClothesContextValue | null>(null)

export function ClothesProvider({
  children,
  dbName,
}: {
  children: ReactNode
  /** Abweichender Datenbankname - im Test, damit sich Faelle nicht vermischen. */
  dbName?: string
}) {
  const [db, setDb] = useState<IDBPDatabase<ClothesDB> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const [households, setHouseholds] = useState<Household[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<ClothingItem[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const opened = await openClothesDB(dbName)
        await repo.seedIfEmpty(opened)

        if (cancelled) return

        const [h, c, i] = await Promise.all([
          repo.listHouseholds(opened),
          repo.listCategories(opened),
          repo.listItems(opened),
        ])

        if (cancelled) return

        setHouseholds(h)
        setCategories(c)
        setItems(i)
        setDb(opened)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause : new Error(String(cause)))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dbName])

  const refreshItems = useCallback(async (handle: IDBPDatabase<ClothesDB>) => {
    setItems(await repo.listItems(handle))
  }, [])

  /*
   * Lesezugriffe haengen nur an der Datenbank, nicht am geladenen Bestand.
   * Wuerden sie im grossen useMemo unten liegen, bekaemen sie bei jeder
   * Bestandsaenderung eine neue Identitaet - und jede Karte wuerde ihr Foto
   * erneut laden.
   */
  const loadImages = useCallback(
    async (itemId: Id) => (db ? repo.getImages(db, itemId) : undefined),
    [db],
  )

  const listEvents = useCallback(
    async (itemId: Id) => (db ? repo.listEvents(db, itemId) : []),
    [db],
  )

  /*
   * Aus den geladenen Stuecken abgeleitet statt getrennt gehalten: so kann die Zahl
   * niemals von der Anzeige abweichen.
   */
  const itemsPerCategory = useMemo(() => {
    const counts = new Map<Id, number>()

    for (const item of items) {
      if (!item.categoryId) continue
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
    }

    return counts
  }, [items])

  const value = useMemo<ClothesContextValue>(() => {
    /** Schreibzugriffe brauchen eine offene Datenbank - vorher gibt es keine UI. */
    const need = () => {
      if (!db) throw new Error('Datenbank noch nicht bereit')
      return db
    }

    return {
      ready: db !== null,
      error,
      households,
      categories,
      items,

      addItem: async (input) => {
        const handle = need()
        const item = await repo.createItem(handle, input)
        await refreshItems(handle)

        return item
      },

      moveItem: async (itemId, target) => {
        const handle = need()
        await repo.moveItem(handle, itemId, target)
        await refreshItems(handle)
      },

      setItemCategory: async (itemId, categoryId) => {
        const handle = need()
        await repo.setItemCategory(handle, itemId, categoryId)
        await refreshItems(handle)
      },

      renameItem: async (itemId, title) => {
        const handle = need()
        await repo.renameItem(handle, itemId, title)
        await refreshItems(handle)
      },

      deleteItem: async (itemId) => {
        const handle = need()
        await repo.deleteItem(handle, itemId)
        await refreshItems(handle)
      },

      addCategory: async (input) => {
        const handle = need()
        await repo.createCategory(handle, input)
        setCategories(await repo.listCategories(handle))
      },

      updateCategory: async (id, patch) => {
        const handle = need()
        await repo.updateCategory(handle, id, patch)
        setCategories(await repo.listCategories(handle))
      },

      deleteCategory: async (id) => {
        const handle = need()
        const affected = await repo.deleteCategory(handle, id)

        setCategories(await repo.listCategories(handle))
        // Betroffene Stuecke sind jetzt unkategorisiert - die Anzeige muss das sehen.
        await refreshItems(handle)

        return affected
      },

      moveCategory: async (id, direction) => {
        const handle = need()
        await repo.moveCategory(handle, id, direction)
        setCategories(await repo.listCategories(handle))
      },

      itemsPerCategory,

      renameHousehold: async (id, name) => {
        const handle = need()
        await repo.renameHousehold(handle, id, name)
        setHouseholds(await repo.listHouseholds(handle))
      },

      exportBackup: () => backup.exportBackup(need()),

      importBackup: async (archive) => {
        const handle = need()
        const result = await backup.importBackup(handle, archive)

        // Alles neu einlesen - die Sicherung hat den kompletten Bestand ersetzt.
        const [h, c, i] = await Promise.all([
          repo.listHouseholds(handle),
          repo.listCategories(handle),
          repo.listItems(handle),
        ])

        setHouseholds(h)
        setCategories(c)
        setItems(i)

        return result
      },

      loadImages,
      listEvents,
    }
  }, [
    db,
    error,
    households,
    categories,
    items,
    itemsPerCategory,
    refreshItems,
    loadImages,
    listEvents,
  ])

  return <ClothesContext.Provider value={value}>{children}</ClothesContext.Provider>
}

export function useClothes(): ClothesContextValue {
  const value = useContext(ClothesContext)
  if (!value) throw new Error('useClothes ausserhalb von ClothesProvider verwendet')

  return value
}
