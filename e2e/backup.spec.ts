import { expect, test } from '@playwright/test'

import { WardrobePage } from './pages/WardrobePage.ts'

/*
 * Die Sicherung ist der einzige Rettungsweg dieser App: es gibt keinen Sync, und die
 * Daten haengen am Origin. Deshalb wird hier die vollstaendige Rundreise geprueft und
 * nicht nur, ob ein Knopf reagiert.
 */

let wardrobe: WardrobePage

test.beforeEach(async ({ page }) => {
  wardrobe = new WardrobePage(page)
  await wardrobe.open()
})

test('bietet einen Export mit datiertem Dateinamen an', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })

  const settings = await wardrobe.openSettings()
  const { fileName } = await settings.exportBackup()

  expect(fileName).toMatch(/^kleiderschrank-\d{4}-\d{2}-\d{2}\.zip$/)
  await expect(settings.backupStatus).toContainText('Sicherung erstellt')
})

test('exportiert auch einen leeren Kleiderschrank', async () => {
  const settings = await wardrobe.openSettings()

  // Kein Sonderfall, der scheitern darf - der Nutzer weiss nicht, dass er leer ist.
  const { fileName } = await settings.exportBackup()
  expect(fileName).toContain('kleiderschrank-')
})

test('stellt Kleidung samt Foto und Verlauf wieder her', async () => {
  await wardrobe.addItem('Lieblingshose', { category: 'Hose' })
  await wardrobe.dragCardToLane('Lieblingshose', wardrobe.top)
  await wardrobe.top.expectCount(1)

  const settings = await wardrobe.openSettings()
  const { path } = await settings.exportBackup()
  await settings.close()

  // Alles loeschen, damit die Wiederherstellung etwas zu tun hat.
  const detail = await wardrobe.openItem('Lieblingshose')
  await detail.startDelete()
  await detail.confirmDelete()
  await wardrobe.top.expectCount(0)

  const settingsAgain = await wardrobe.openSettings()
  await settingsAgain.importBackup(path)
  await expect(settingsAgain.backupStatus).toContainText('1 Stück wiederhergestellt')
  await settingsAgain.close()

  await wardrobe.top.expectCount(1)

  // Das Foto muss mitgekommen sein, nicht nur der Datensatz.
  const restored = await wardrobe.openItem('Lieblingshose')
  await expect(restored.photo).toBeVisible()

  await restored.openHistory()
  await expect(restored.historyEntries()).toHaveCount(2)
  expect(await restored.historyTexts()).toContain('Neu → Haushalt 1')
})

test('stellt umbenannte Haushalte und Kategorien wieder her', async () => {
  const settings = await wardrobe.openSettings()
  await settings.renameHousehold(0, 'Bei Mama')
  await settings.renameCategory('Hose', 'Jeans')
  const { path } = await settings.exportBackup()
  await settings.close()

  await expect(wardrobe.top.title).toHaveText('Bei Mama')

  // In einem frischen Zustand wiederherstellen.
  const restore = await wardrobe.openSettings()
  await restore.importBackup(path)
  await restore.close()

  await expect(wardrobe.top.title).toHaveText('Bei Mama')
  await expect(wardrobe.filterChip('Jeans')).toBeVisible()
})

test('warnt vor dem Ueberschreiben und laesst sich abbrechen', async () => {
  await wardrobe.addItem('Lieblingshose')

  const settings = await wardrobe.openSettings()
  await settings.root.getByTestId('sicherung-import').click()

  await expect(settings.root.getByTestId('sicherung-bestaetigung')).toContainText(
    'ersetzt den gesamten Inhalt',
  )

  await settings.cancelImport()
  await settings.close()

  await wardrobe.inbox.expectCount(1)
})

test('weist eine Datei ab, die keine Sicherung ist', async () => {
  const settings = await wardrobe.openSettings()

  await settings.root.getByTestId('sicherung-import').click()
  await settings.root.getByTestId('sicherung-datei-waehlen').click()
  // Ein PNG ist kein ZIP - der Fehler muss verstaendlich sein, nicht technisch.
  await settings.root
    .getByTestId('sicherung-datei')
    .setInputFiles('public/icon-192.png')

  await expect(settings.backupStatus).toContainText('kein lesbares ZIP-Archiv')
})

test('laesst den Bestand nach einem Fehlversuch unveraendert', async () => {
  await wardrobe.addItem('Lieblingshose')

  const settings = await wardrobe.openSettings()
  await settings.root.getByTestId('sicherung-import').click()
  await settings.root.getByTestId('sicherung-datei-waehlen').click()
  await settings.root
    .getByTestId('sicherung-datei')
    .setInputFiles('public/icon-192.png')

  await expect(settings.backupStatus).toBeVisible()
  await settings.close()

  // Ein Fehlversuch darf nichts kosten.
  await wardrobe.inbox.expectCount(1)
})
