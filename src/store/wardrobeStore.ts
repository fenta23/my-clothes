import * as categoryRepo from '../entities/category/repository.ts'
import type { Category } from '../entities/category/types.ts'
import * as clothingRepo from '../entities/clothing/repository.ts'
import type { ClothingItem, ItemImages } from '../entities/clothing/types.ts'
import type { Db } from '../entities/db.ts'
import { openClothesDB } from '../entities/db.ts'
import * as eventRepo from '../entities/event/repository.ts'
import type { ItemEvent } from '../entities/event/types.ts'
import * as householdRepo from '../entities/household/repository.ts'
import type { Household, HouseholdRef } from '../entities/household/types.ts'
import * as outfitRepo from '../entities/outfit/repository.ts'
import type { Outfit } from '../entities/outfit/types.ts'
import { seedIfEmpty } from '../entities/seed.ts'
import type { Id } from '../shared/db/ids.ts'
import { createStore, type Store } from '../shared/store/createStore.ts'

/**
 * Der gemeinsame Zustand der App.
 *
 * Bewusst in `app` und nicht in einem Feature: er verbindet mehrere Entitaeten, und
 * kein Feature soll ein anderes kennen muessen. Die Features lesen ueber Selektoren
 * nur das, was sie brauchen - deshalb rendert ein neues Foto nicht mehr die
 * Kategorienliste neu.
 *
 * Der Zustand wird nach jedem Schreiben neu gelesen, statt ihn von Hand nachzufuehren.
 * Bei der erwarteten Datenmenge - ein Kinderkleiderschrank, keine Lagerverwaltung -
 * ist das unauffaellig schnell und schliesst eine ganze Klasse von Fehlern aus, bei
 * denen Anzeige und Datenbank auseinanderlaufen.
 */

export interface WardrobeState {
  status: 'laedt' | 'bereit' | 'fehler'
  error: Error | null

  households: Household[]
  categories: Category[]
  items: ClothingItem[]
  outfits: Outfit[]
}

const EMPTY: WardrobeState = {
  status: 'laedt',
  error: null,
  households: [],
  categories: [],
  items: [],
  outfits: [],
}

export interface WardrobeStore extends Store<WardrobeState> {
  open: (dbName?: string) => Promise<void>

  // Kleidung
  addItem: (input: clothingRepo.CreateItemInput) => Promise<ClothingItem>
  moveItem: (itemId: Id, target: HouseholdRef) => Promise<void>
  setItemCategory: (itemId: Id, categoryId: Id | null) => Promise<void>
  renameItem: (itemId: Id, title: string) => Promise<void>
  deleteItem: (itemId: Id) => Promise<void>
  loadImages: (itemId: Id) => Promise<ItemImages | undefined>
  listEvents: (itemId: Id) => Promise<ItemEvent[]>

  // Kategorien
  addCategory: (input: { name: string; emoji: string; colorHex: string }) => Promise<void>
  updateCategory: (
    id: Id,
    patch: Partial<Pick<Category, 'name' | 'emoji' | 'colorHex' | 'sortOrder' | 'slot'>>,
  ) => Promise<void>
  deleteCategory: (id: Id) => Promise<number>
  moveCategory: (id: Id, direction: 'up' | 'down') => Promise<void>

  // Outfits
  addOutfit: (input: { name: string; itemIds: Id[] }) => Promise<Outfit>
  renameOutfit: (id: Id, name: string) => Promise<void>
  setOutfitItems: (id: Id, itemIds: Id[]) => Promise<void>
  deleteOutfit: (id: Id) => Promise<void>

  // Haushalte
  renameHousehold: (id: Id, name: string) => Promise<void>

  /** Nur fuer die Sicherung: direkter Zugriff auf die geoeffnete Datenbank. */
  requireDb: () => Db
  /** Nach dem Einspielen einer Sicherung: alles neu einlesen. */
  reloadAll: () => Promise<void>
}

export function createWardrobeStore(): WardrobeStore {
  const store = createStore<WardrobeState>(EMPTY)
  let db: Db | null = null

  const requireDb = (): Db => {
    if (!db) throw new Error('Datenbank noch nicht geöffnet')

    return db
  }

  const refreshItems = async () => {
    const items = await clothingRepo.listItems(requireDb())
    store.setState((s) => ({ ...s, items }))
  }

  const refreshCategories = async () => {
    const categories = await categoryRepo.listCategories(requireDb())
    store.setState((s) => ({ ...s, categories }))
  }

  const refreshOutfits = async () => {
    const outfits = await outfitRepo.listOutfits(requireDb())
    store.setState((s) => ({ ...s, outfits }))
  }

  const refreshHouseholds = async () => {
    const households = await householdRepo.listHouseholds(requireDb())
    store.setState((s) => ({ ...s, households }))
  }

  const reloadAll = async () => {
    const handle = requireDb()
    const [households, categories, items, outfits] = await Promise.all([
      householdRepo.listHouseholds(handle),
      categoryRepo.listCategories(handle),
      clothingRepo.listItems(handle),
      outfitRepo.listOutfits(handle),
    ])

    store.setState((s) => ({ ...s, households, categories, items, outfits }))
  }

  return {
    ...store,
    requireDb,
    reloadAll,

    open: async (dbName) => {
      try {
        db = await openClothesDB(dbName)
        await seedIfEmpty(db)
        await reloadAll()
        store.setState((s) => ({ ...s, status: 'bereit' }))
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause))
        store.setState((s) => ({ ...s, status: 'fehler', error }))
      }
    },

    addItem: async (input) => {
      const item = await clothingRepo.createItem(requireDb(), input)
      await refreshItems()

      return item
    },

    moveItem: async (itemId, target) => {
      await clothingRepo.moveItem(requireDb(), itemId, target)
      await refreshItems()
    },

    setItemCategory: async (itemId, categoryId) => {
      await clothingRepo.setItemCategory(requireDb(), itemId, categoryId)
      await refreshItems()
    },

    renameItem: async (itemId, title) => {
      await clothingRepo.renameItem(requireDb(), itemId, title)
      await refreshItems()
    },

    deleteItem: async (itemId) => {
      await clothingRepo.deleteItem(requireDb(), itemId)

      await refreshItems()
      // Das Stueck ist auch aus jedem Outfit geflogen - die Anzeige muss das sehen.
      await refreshOutfits()
    },

    loadImages: (itemId) => clothingRepo.getImages(requireDb(), itemId),
    listEvents: (itemId) => eventRepo.listEvents(requireDb(), itemId),

    addCategory: async (input) => {
      await categoryRepo.createCategory(requireDb(), input)
      await refreshCategories()
    },

    updateCategory: async (id, patch) => {
      await categoryRepo.updateCategory(requireDb(), id, patch)
      await refreshCategories()
    },

    deleteCategory: async (id) => {
      const affected = await categoryRepo.deleteCategory(requireDb(), id)

      await refreshCategories()
      // Betroffene Stuecke sind jetzt unkategorisiert - die Anzeige muss das sehen.
      await refreshItems()

      return affected
    },

    moveCategory: async (id, direction) => {
      await categoryRepo.moveCategory(requireDb(), id, direction)
      await refreshCategories()
    },

    addOutfit: async (input) => {
      const outfit = await outfitRepo.createOutfit(requireDb(), input)
      await refreshOutfits()

      return outfit
    },

    renameOutfit: async (id, name) => {
      await outfitRepo.renameOutfit(requireDb(), id, name)
      await refreshOutfits()
    },

    setOutfitItems: async (id, itemIds) => {
      await outfitRepo.setOutfitItems(requireDb(), id, itemIds)
      await refreshOutfits()
    },

    deleteOutfit: async (id) => {
      await outfitRepo.deleteOutfit(requireDb(), id)
      await refreshOutfits()
    },

    renameHousehold: async (id, name) => {
      await householdRepo.renameHousehold(requireDb(), id, name)
      await refreshHouseholds()
    },
  }
}
