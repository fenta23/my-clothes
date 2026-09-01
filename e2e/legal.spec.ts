import { expect, test } from '@playwright/test'

import { WardrobePage } from './pages/WardrobePage.ts'

let wardrobe: WardrobePage

test.beforeEach(async ({ page }) => {
  wardrobe = new WardrobePage(page)
  await wardrobe.open()
})

test.describe('Seitenleiste', () => {
  test('bietet Einstellungen, Datenschutz und Impressum an', async ({ page }) => {
    await wardrobe.openMenu()

    await expect(page.getByTestId('menue-eintrag')).toHaveCount(3)
    for (const view of ['einstellungen', 'datenschutz', 'impressum']) {
      await expect(
        page.locator(`[data-testid="menue-eintrag"][data-view="${view}"]`),
      ).toBeVisible()
    }
  })

  test('zeigt auf der Startebene keinen Zurueck-Pfeil', async ({ page }) => {
    await wardrobe.openMenu()

    await expect(page.getByTestId('menue-zurueck')).toBeHidden()
  })

  test('navigiert in sich selbst statt Blaetter zu stapeln', async ({ page }) => {
    await wardrobe.openMenuEntry('datenschutz')

    await expect(page.getByTestId('datenschutz-panel')).toBeVisible()
    // Die Liste ist weg, nicht verdeckt - es gibt nur eine Ebene.
    await expect(page.getByTestId('menue-eintrag')).toHaveCount(0)

    await page.getByTestId('menue-zurueck').click()

    await expect(page.getByTestId('menue-eintrag')).toHaveCount(3)
    await expect(page.getByTestId('datenschutz-panel')).toBeHidden()
  })

  test('schliesst ueber das Kreuz', async ({ page }) => {
    await wardrobe.openMenu()

    await page.getByTestId('menue-schliessen').click()

    await expect(page.getByTestId('hauptmenue')).toBeHidden()
    await expect(page.getByTestId('wardrobe')).toBeVisible()
  })

  test('schliesst beim Tippen daneben', async ({ page }) => {
    await wardrobe.openMenu()

    // Links neben die Leiste tippen.
    await page.getByRole('presentation').click({ position: { x: 10, y: 300 } })

    await expect(page.getByTestId('hauptmenue')).toBeHidden()
  })
})

test.describe('Datenschutz', () => {
  test('nennt die Kernaussage: nichts verlaesst das Gerät', async ({ page }) => {
    await wardrobe.openMenuEntry('datenschutz')

    const panel = page.getByTestId('datenschutz-panel')
    await expect(panel).toContainText('ohne Konto')
    await expect(panel).toContainText('verlassen dein Gerät nicht')
    await expect(panel).toContainText('IndexedDB')
  })

  test('benennt GitHub Pages als einzigen Dienst', async ({ page }) => {
    await wardrobe.openMenuEntry('datenschutz')

    const panel = page.getByTestId('datenschutz-panel')
    await expect(panel).toContainText('GitHub Pages')
    // Diese Zusage ist im Code geprueft: kein fetch, keine externen Skripte.
    await expect(panel).toContainText('Weitere Dienste werden nicht eingesetzt')
  })

  test('verweist fuer die Datenuebertragbarkeit auf den Export', async ({ page }) => {
    await wardrobe.openMenuEntry('datenschutz')

    await expect(page.getByTestId('datenschutz-panel')).toContainText('ZIP-Datei')
  })

  test('nennt eine Kontaktadresse', async ({ page }) => {
    await wardrobe.openMenuEntry('datenschutz')

    await expect(
      page.getByTestId('datenschutz-panel').getByRole('link', { name: /@/ }).first(),
    ).toHaveAttribute('href', /^mailto:/)
  })
})

test.describe('Impressum', () => {
  test('weist das Projekt als privat und nicht-kommerziell aus', async ({ page }) => {
    await wardrobe.openMenuEntry('impressum')

    await expect(page.getByTestId('impressum-panel')).toContainText(
      'nicht-kommerzielles Open-Source-Projekt',
    )
  })

  test('nennt Verantwortlichen und Kontakt', async ({ page }) => {
    await wardrobe.openMenuEntry('impressum')

    await expect(page.getByTestId('impressum-verantwortlich')).not.toBeEmpty()
    await expect(
      page.getByTestId('impressum-panel').getByRole('link', { name: /@/ }),
    ).toHaveAttribute('href', /^mailto:/)
  })

  test('macht ein fehlendes Verantwortlichen-Feld sichtbar', async ({ page }) => {
    await wardrobe.openMenuEntry('impressum')

    /*
     * Im Dev-Server ist VITE_CONTROLLER_NAME nicht gesetzt, also muss die Warnung
     * erscheinen. Genau das ist die Absicht: ein unvollstaendiges Impressum soll
     * auffallen und nicht als leere Zeile durchgehen.
     */
    await expect(page.getByTestId('impressum-warnung')).toBeVisible()
    await expect(page.getByTestId('impressum-verantwortlich')).toContainText(
      'VITE_CONTROLLER_NAME',
    )
  })

  test('verlinkt das Repository fuer Rueckmeldungen', async ({ page }) => {
    await wardrobe.openMenuEntry('impressum')

    const link = page.getByTestId('impressum-panel').getByRole('link', { name: 'GitHub-Issue' })
    await expect(link).toHaveAttribute('href', /github\.com\/.+\/issues/)
    // Externe Ziele ohne rel=noopener geben der Zielseite Zugriff auf window.opener.
    await expect(link).toHaveAttribute('rel', /noopener/)
  })
})
