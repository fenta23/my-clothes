import { expect, test } from '@playwright/test'

import { WardrobePage } from './pages/WardrobePage.ts'

let wardrobe: WardrobePage

test.beforeEach(async ({ page }) => {
  wardrobe = new WardrobePage(page)
  await wardrobe.open()
})

test.describe('Haushalte', () => {
  test('uebernimmt einen neuen Namen in die Bahn', async () => {
    const settings = await wardrobe.openSettings()
    await settings.renameHousehold(0, 'Bei Mama')
    await settings.close()

    await expect(wardrobe.top.title).toHaveText('Bei Mama')
  })

  test('behaelt den Namen nach einem Neustart', async () => {
    const settings = await wardrobe.openSettings()
    await settings.renameHousehold(1, 'Bei Papa')
    await settings.close()

    await wardrobe.reload()

    await expect(wardrobe.bottom.title).toHaveText('Bei Papa')
  })

  test('weist einen leeren Namen ab', async () => {
    const settings = await wardrobe.openSettings()
    await settings.renameHousehold(0, '   ')
    await settings.close()

    // Eine unbeschriftete Bahn waere schlimmer als der alte Name.
    await expect(wardrobe.top.title).toHaveText('Haushalt 1')
  })

  test('laesst die Historie den alten Namen behalten', async () => {
    await wardrobe.addItem('Lieblingshose')
    await wardrobe.dragCardToLane('Lieblingshose', wardrobe.top)
    await wardrobe.top.expectCount(1)

    const settings = await wardrobe.openSettings()
    await settings.renameHousehold(0, 'Bei Mama')
    await settings.close()

    const detail = await wardrobe.openItem('Lieblingshose')
    await expect(detail.historyEntries()).toHaveCount(2)

    // Der Verlauf erzaehlt, wie es damals hiess - nicht, wie es heute heisst.
    expect(await detail.historyTexts()).toContain('Neu → Haushalt 1')
  })
})

test.describe('Kategorien', () => {
  test('benennt eine Kategorie um und zeigt sie im Filter neu an', async () => {
    const settings = await wardrobe.openSettings()
    await settings.renameCategory('Hose', 'Jeans')
    await settings.close()

    await expect(wardrobe.filterChip('Jeans')).toBeVisible()
    await expect(wardrobe.filterChip('Hose')).toHaveCount(0)
  })

  test('legt eine neue Kategorie an', async () => {
    const settings = await wardrobe.openSettings()
    await settings.createCategory('Mütze')
    await settings.close()

    await expect(wardrobe.filterChip('Mütze')).toBeVisible()
  })

  test('sortiert eine Kategorie nach oben', async () => {
    const settings = await wardrobe.openSettings()
    const before = await settings.categoryOrder()

    await settings.moveCategoryUp(before[1]!)

    const after = await settings.categoryOrder()
    expect(after[0]).toBe(before[1])
    expect(after[1]).toBe(before[0])
  })

  test('bietet am oberen Rand kein Hochschieben an', async () => {
    const settings = await wardrobe.openSettings()
    const first = (await settings.categoryOrder())[0]!

    await expect(
      settings.categoryRow(first).getByTestId('kategorie-hoch'),
    ).toBeDisabled()
  })

  test('zeigt an, wie viele Stuecke eine Kategorie nutzen', async () => {
    await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

    const settings = await wardrobe.openSettings()

    await expect(settings.changedLabel('Hose')).toContainText('1 Stück')
    await expect(settings.changedLabel('Rock')).toContainText('Noch nicht verwendet')
  })

  test('warnt vor dem Loeschen mit der Zahl betroffener Stuecke', async () => {
    await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

    const settings = await wardrobe.openSettings()
    const confirm = await settings.startDeleteCategory('Hose')

    await expect(confirm).toContainText('1 Stück bleibt erhalten')
  })

  test('loescht erst nach Bestaetigung', async () => {
    const settings = await wardrobe.openSettings()

    await settings.startDeleteCategory('Rock')
    await settings.keepCategory('Rock')
    await expect(settings.categoryRow('Rock')).toBeVisible()

    await settings.startDeleteCategory('Rock')
    await settings.confirmDeleteCategory('Rock')
  })

  test('behaelt die Kleidung beim Loeschen ihrer Kategorie', async () => {
    await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

    const settings = await wardrobe.openSettings()
    await settings.startDeleteCategory('Hose')
    await settings.confirmDeleteCategory('Hose')
    await settings.close()

    // Kleidung verschwindet nie, weil eine Schublade wegfaellt.
    await expect(wardrobe.card('Lieblingshose')).toBeVisible()
    await wardrobe.inbox.expectCount(1)
  })
})
