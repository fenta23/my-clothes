import { expect, type Locator, type Page } from '@playwright/test'

/** Die Detailansicht eines Kleidungsstuecks samt Verlauf. */
export class ItemDetailSheetPage {
  readonly root: Locator

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('detail-sheet')
  }

  get titleInput(): Locator {
    return this.root.getByTestId('detail-titel')
  }

  get photo(): Locator {
    return this.root.getByTestId('detail-foto')
  }

  /** Alle Verlaufstexte, neueste zuerst. */
  historyTexts(): Promise<string[]> {
    return this.root.getByTestId('verlauf-text').allTextContents()
  }

  historyEntries(): Locator {
    return this.root.getByTestId('verlauf-eintrag')
  }

  categoryChip(name: string): Locator {
    return this.root.locator(
      `[data-testid="detail-kategorie-chip"][data-category="${name}"]`,
    )
  }

  householdChip(target: string): Locator {
    return this.root.locator(`[data-testid="detail-haushalt-chip"][data-target="${target}"]`)
  }

  async moveTo(target: string): Promise<void> {
    await this.householdChip(target).click()
    await expect(this.householdChip(target)).toHaveAttribute('aria-pressed', 'true')
  }

  async rename(name: string): Promise<void> {
    await this.titleInput.fill(name)
    // Uebernommen wird beim Verlassen des Feldes.
    await this.titleInput.blur()
  }

  async close(): Promise<void> {
    await this.root.getByTestId('fertig').click()
    await expect(this.root).toBeHidden()
  }

  /** Startet das Loeschen; die Rueckfrage bleibt offen. */
  async startDelete(): Promise<void> {
    await this.root.getByTestId('loeschen').click()
    await expect(this.root.getByTestId('loesch-bestaetigung')).toBeVisible()
  }

  async keepAfterAll(): Promise<void> {
    await this.root.getByTestId('behalten').click()
  }

  async confirmDelete(): Promise<void> {
    await this.root.getByTestId('loeschen-endgueltig').click()
    await expect(this.root).toBeHidden()
  }
}
