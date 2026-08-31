import { expect, type Locator, type Page } from '@playwright/test'

/** Das Sheet zum Anlegen eines Kleidungsstuecks. */
export class AddClothingSheetPage {
  readonly root: Locator

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('add-sheet')
  }

  get galleryInput(): Locator {
    return this.root.getByTestId('galerie-input')
  }

  get cameraInput(): Locator {
    return this.root.getByTestId('kamera-input')
  }

  get titleInput(): Locator {
    return this.root.getByTestId('titel-eingabe')
  }

  get preview(): Locator {
    return this.root.getByTestId('vorschau')
  }

  get error(): Locator {
    return this.root.getByTestId('fehler')
  }

  categoryChip(name: string): Locator {
    return this.root.locator(`[data-testid="kategorie-chip"][data-category="${name}"]`)
  }

  targetChip(target: string): Locator {
    return this.root.locator(`[data-testid="ziel-chip"][data-target="${target}"]`)
  }

  /** Waehlt ein Bild aus der Galerie und wartet, bis das Formular erscheint. */
  async choosePhoto(fixturePath: string): Promise<void> {
    await this.galleryInput.setInputFiles(fixturePath)
    await expect(this.titleInput).toBeVisible()
  }

  async createCategory(name: string): Promise<void> {
    await this.root.getByTestId('neue-kategorie-eingabe').fill(name)
    await this.root.getByTestId('kategorie-anlegen').click()
    await expect(this.categoryChip(name)).toBeVisible()
  }

  async save(): Promise<void> {
    await this.root.getByTestId('speichern').click()
    await expect(this.root).toBeHidden()
  }

  async cancel(): Promise<void> {
    await this.root.getByTestId('abbrechen').click()
  }

  async chooseAnotherPhoto(): Promise<void> {
    await this.root.getByTestId('anderes-foto').click()
  }
}
