import { expect, type Locator, type Page } from '@playwright/test'

/** Einstellungen: Haushaltsnamen und Kategorienverwaltung. */
export class SettingsSheetPage {
  readonly root: Locator

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('settings-sheet')
  }

  // --- Haushalte ------------------------------------------------------

  householdInputs(): Locator {
    return this.root.getByTestId('haushalt-name')
  }

  async renameHousehold(index: number, name: string): Promise<void> {
    const input = this.householdInputs().nth(index)
    await input.fill(name)
    // Uebernommen wird beim Verlassen des Feldes.
    await input.blur()
  }

  // --- Kategorien -----------------------------------------------------

  categoryRow(name: string): Locator {
    return this.root.locator(`[data-testid="kategorie-zeile"][data-category="${name}"]`)
  }

  /** Namen aller Kategorien in ihrer aktuellen Reihenfolge. */
  async categoryOrder(): Promise<string[]> {
    return this.root.getByTestId('kategorie-zeile').evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-category') ?? ''),
    )
  }

  async renameCategory(name: string, next: string): Promise<void> {
    const input = this.categoryRow(name).getByTestId('kategorie-name')
    await input.fill(next)
    await input.blur()
    await expect(this.categoryRow(next)).toBeVisible()
  }

  /** Aktuelle Position einer Kategorie in der Liste. */
  async indexOf(name: string): Promise<number> {
    return Number(await this.categoryRow(name).getAttribute('data-index'))
  }

  async moveCategoryUp(name: string): Promise<void> {
    const before = await this.indexOf(name)
    await this.categoryRow(name).getByTestId('kategorie-hoch').click()

    // Auf die neue Position warten, statt sofort weiterzulesen.
    await expect(this.categoryRow(name)).toHaveAttribute('data-index', String(before - 1))
  }

  async moveCategoryDown(name: string): Promise<void> {
    const before = await this.indexOf(name)
    await this.categoryRow(name).getByTestId('kategorie-runter').click()

    await expect(this.categoryRow(name)).toHaveAttribute('data-index', String(before + 1))
  }

  async createCategory(name: string): Promise<void> {
    await this.root.getByTestId('neue-kategorie-eingabe').fill(name)
    await this.root.getByTestId('neue-kategorie-anlegen').click()
    await expect(this.categoryRow(name)).toBeVisible()
  }

  /** Startet das Loeschen; die Rueckfrage bleibt offen. */
  async startDeleteCategory(name: string): Promise<Locator> {
    const row = this.categoryRow(name)
    await row.getByTestId('kategorie-loeschen').click()

    const confirm = row.getByTestId('kategorie-loesch-bestaetigung')
    await expect(confirm).toBeVisible()

    return confirm
  }

  async confirmDeleteCategory(name: string): Promise<void> {
    await this.categoryRow(name).getByTestId('kategorie-loeschen-endgueltig').click()
    await expect(this.categoryRow(name)).toBeHidden()
  }

  async keepCategory(name: string): Promise<void> {
    await this.categoryRow(name).getByTestId('kategorie-behalten').click()
  }

  changedLabel(name: string): Locator {
    return this.categoryRow(name).getByTestId('kategorie-geaendert')
  }

  // --- Sicherung ------------------------------------------------------

  get backupStatus(): Locator {
    return this.root.getByTestId('sicherung-status')
  }

  /** Loest den Export aus und gibt den Pfad der heruntergeladenen Datei zurueck. */
  async exportBackup(): Promise<{ path: string; fileName: string }> {
    const downloadPromise = this.page.waitForEvent('download')
    await this.root.getByTestId('sicherung-export').click()

    const download = await downloadPromise
    const path = await download.path()
    if (!path) throw new Error('Kein Download angekommen')

    return { path, fileName: download.suggestedFilename() }
  }

  /** Spielt eine Sicherung ein - inklusive der Rueckfrage davor. */
  async importBackup(filePath: string): Promise<void> {
    await this.root.getByTestId('sicherung-import').click()
    await expect(this.root.getByTestId('sicherung-bestaetigung')).toBeVisible()

    await this.root.getByTestId('sicherung-datei-waehlen').click()
    await this.root.getByTestId('sicherung-datei').setInputFiles(filePath)

    await expect(this.backupStatus).toBeVisible()
  }

  async cancelImport(): Promise<void> {
    await this.root.getByTestId('sicherung-import').click()
    await this.root.getByTestId('sicherung-abbrechen').click()
  }

  /** Schliesst die Seitenleiste samt Einstellungen. */
  async close(): Promise<void> {
    await this.page.getByTestId('menue-schliessen').click()
    await expect(this.root).toBeHidden()
  }
}
