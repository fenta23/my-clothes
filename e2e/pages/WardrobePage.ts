import { expect, type Locator, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

import { AddClothingSheetPage } from './AddClothingSheetPage.ts'
import { ItemDetailSheetPage } from './ItemDetailSheetPage.ts'
import { LanePage } from './LanePage.ts'
import { pointerDrag, type PointerType } from './gestures.ts'

/**
 * Der Hauptbildschirm - Einstiegspunkt fuer alle E2E-Tests.
 *
 * Als Testbild dient ein echtes PNG aus dem Projekt; so laeuft die vollstaendige
 * Bildverarbeitung inklusive Skalierung mit, statt gemockt zu werden.
 */
export const PHOTO_FIXTURE = fileURLToPath(new URL('../../public/icon-192.png', import.meta.url))

export class WardrobePage {
  readonly top: LanePage
  readonly inbox: LanePage
  readonly bottom: LanePage
  readonly addSheet: AddClothingSheetPage
  readonly detailSheet: ItemDetailSheetPage

  constructor(private readonly page: Page) {
    this.top = new LanePage(page, 'lane-top')
    this.inbox = new LanePage(page, 'lane-inbox')
    this.bottom = new LanePage(page, 'lane-bottom')
    this.addSheet = new AddClothingSheetPage(page)
    this.detailSheet = new ItemDetailSheetPage(page)
  }

  async open(): Promise<void> {
    await this.page.goto('/')
    await expect(this.page.getByTestId('wardrobe')).toBeVisible()
  }

  async reload(): Promise<void> {
    await this.page.reload()
    await expect(this.page.getByTestId('wardrobe')).toBeVisible()
  }

  /** Legt ein Kleidungsstueck ueber den Galerie-Weg an. */
  async addItem(
    title: string,
    options: { category?: string; target?: string } = {},
  ): Promise<void> {
    await this.page.getByTestId('add-button').click()
    await this.addSheet.choosePhoto(PHOTO_FIXTURE)
    await this.addSheet.titleInput.fill(title)

    if (options.category) await this.addSheet.categoryChip(options.category).click()
    if (options.target) await this.addSheet.targetChip(options.target).click()

    await this.addSheet.save()
  }

  /** Oeffnet die Detailansicht einer Karte. */
  async openItem(title: string): Promise<ItemDetailSheetPage> {
    await this.page.locator(`[data-testid="clothing-card"][data-title="${title}"]`).click()
    await expect(this.detailSheet.root).toBeVisible()

    return this.detailSheet
  }

  async dragCardToLane(
    title: string,
    lane: LanePage,
    pointerType: PointerType = 'touch',
  ): Promise<void> {
    const card = this.page.locator(`[data-testid="clothing-card"][data-title="${title}"]`)
    await pointerDrag(this.page, card, lane.root, pointerType)
  }

  // --- Filter ---------------------------------------------------------

  get allFilter(): Locator {
    return this.page.getByTestId('filter-alle')
  }

  filterChip(category: string): Locator {
    return this.page.locator(`[data-testid="filter-chip"][data-category="${category}"]`)
  }

  async filterBy(category: string): Promise<void> {
    await this.filterChip(category).click()
    await expect(this.filterChip(category)).toHaveAttribute('aria-pressed', 'true')
  }

  card(title: string): Locator {
    return this.page.locator(`[data-testid="clothing-card"][data-title="${title}"]`)
  }
}
