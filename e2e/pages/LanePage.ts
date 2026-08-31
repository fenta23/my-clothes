import { expect, type Locator, type Page } from '@playwright/test'

/** Eine der drei Bahnen: oben, Mitte, unten. */
export class LanePage {
  readonly root: Locator

  constructor(page: Page, testId: 'lane-top' | 'lane-inbox' | 'lane-bottom') {
    this.root = page.getByTestId(testId)
  }

  get title(): Locator {
    return this.root.getByTestId('lane-title')
  }

  get emptyHint(): Locator {
    return this.root.getByTestId('lane-empty')
  }

  /** Die im Kopf angezeigte Anzahl. */
  async count(): Promise<number> {
    return Number(await this.root.getByTestId('lane-count').textContent())
  }

  /** Eine Karte dieser Bahn, angesprochen ueber ihren Namen. */
  card(title: string): Locator {
    return this.root.locator(`[data-testid="clothing-card"][data-title="${title}"]`)
  }

  cards(): Locator {
    return this.root.getByTestId('clothing-card')
  }

  async expectCount(expected: number): Promise<void> {
    await expect(this.root.getByTestId('lane-count')).toHaveText(String(expected))
  }
}
