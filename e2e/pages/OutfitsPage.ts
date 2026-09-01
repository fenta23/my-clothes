import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Der zweite Bildschirm: gespeicherte Zusammenstellungen.
 *
 * Die Statuszeile ist der eigentliche Gegenstand der Tests - sie beantwortet, ob die
 * Teile eines Outfits gerade beisammen sind.
 */
export class OutfitsPage {
  readonly root: Locator
  readonly editor: Locator
  readonly sheet: Locator

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('outfits')
    this.editor = page.getByTestId('outfit-editor')
    this.sheet = page.getByTestId('outfit-sheet')
  }

  get emptyHint(): Locator {
    return this.root.getByTestId('outfits-leer')
  }

  card(name: string): Locator {
    return this.page.locator(`[data-testid="outfit-karte"][data-name="${name}"]`)
  }

  /** Die Statuszeile einer Kachel - dieselbe Kennung wie im Blatt, aber in der Liste. */
  cardStatus(name: string): Locator {
    return this.card(name).getByTestId('outfit-status')
  }

  /** Alle Teile einer Kachel, in der Reihenfolge der Figur. */
  cardPieces(name: string): Locator {
    return this.card(name).getByTestId('figur-teil')
  }

  /** Die Trageort-Zeilen der Figur im geoeffneten Blatt, von oben nach unten. */
  sheetRows(): Locator {
    return this.sheet.getByTestId('figur-zeile')
  }

  /** Legt ein Outfit an und waehlt die genannten Stuecke aus. */
  async create(name: string, titles: string[]): Promise<void> {
    await this.root.getByTestId('outfit-anlegen').click()
    await expect(this.editor).toBeVisible()

    await this.editor.getByTestId('outfit-editor-name').fill(name)
    for (const title of titles) await this.pick(title)

    await this.editor.getByTestId('outfit-speichern').click()
    await expect(this.editor).toBeHidden()
  }

  /** Schaltet ein Stueck in der Auswahl um. */
  async pick(title: string): Promise<void> {
    const stueck = this.editor.locator(
      `[data-testid="auswahl-stueck"][data-title="${title}"]`,
    )
    const vorher = await stueck.getAttribute('aria-pressed')

    await stueck.click()
    await expect(stueck).toHaveAttribute('aria-pressed', vorher === 'true' ? 'false' : 'true')
  }

  async open(name: string): Promise<Locator> {
    await this.card(name).click()
    await expect(this.sheet).toBeVisible()

    return this.sheet
  }

  async close(): Promise<void> {
    await this.sheet.getByTestId('fertig').click()
    await expect(this.sheet).toBeHidden()
  }

  /** Oeffnet die Auswahl eines vorhandenen Outfits. */
  async edit(): Promise<void> {
    await this.sheet.getByTestId('outfit-teile-aendern').click()
    await expect(this.editor).toBeVisible()
  }

  async save(): Promise<void> {
    await this.editor.getByTestId('outfit-speichern').click()
    await expect(this.editor).toBeHidden()
  }

  async delete(): Promise<void> {
    await this.sheet.getByTestId('loeschen').click()
    await this.sheet.getByTestId('loeschen-endgueltig').click()
    await expect(this.sheet).toBeHidden()
  }
}
