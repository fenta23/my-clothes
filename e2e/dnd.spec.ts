import { expect, test, type Locator, type Page } from '@playwright/test'

/*
 * Warum diese Tests eigene Gesten bauen:
 *
 * Playwrights `dragTo` setzt auf HTML5-Drag-&-Drop, das dnd-kit gar nicht verwendet -
 * und `page.touchscreen` kennt nur Tippen, kein Ziehen. Auch in einem Touch-Projekt
 * verschickt `page.mouse` weiterhin Maus-Ereignisse. Ein Test, der damit gruen wird,
 * beweist ueber das Verhalten auf dem iPhone also nichts.
 *
 * Deshalb werden hier Zeigerereignisse direkt erzeugt - einmal mit `pointerType:
 * 'mouse'`, einmal mit `'touch'`. Das ist genau der Pfad, auf dem dnd-kits
 * PointerSensor lauscht.
 */

async function laneCount(page: Page, title: string): Promise<number> {
  const lane = page.locator('section', { hasText: title }).first()
  const value = await lane.locator('header span').nth(1).textContent()

  return Number(value ?? '-1')
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element ohne Ausdehnung')

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

interface DragOptions {
  pointerType: 'mouse' | 'touch'
  /** Wie lange vor der ersten Bewegung stillgehalten wird. */
  holdMs: number
}

async function pointerDrag(
  page: Page,
  source: Locator,
  target: Locator,
  options: DragOptions,
) {
  const start = await centerOf(source)
  const end = await centerOf(target)

  await page.evaluate(
    async ({ start, end, options }) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

      const fire = (type: string, x: number, y: number) => {
        const element = document.elementFromPoint(x, y) ?? document.body
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            isPrimary: true,
            pointerType: options.pointerType,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: y,
          }),
        )
      }

      fire('pointerdown', start.x, start.y)
      await sleep(options.holdMs)

      for (let i = 1; i <= 12; i += 1) {
        fire(
          'pointermove',
          start.x + ((end.x - start.x) * i) / 12,
          start.y + ((end.y - start.y) * i) / 12,
        )
        await sleep(16)
      }

      fire('pointerup', end.x, end.y)
    },
    { start, end, options },
  )

  // Der Zustand wird nach dem Drop gesetzt; React braucht einen Tick.
  await page.waitForTimeout(120)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'DnD-Spike' })).toBeVisible()
})

test('zeigt die drei Bahnen', async ({ page }) => {
  await expect(page.getByText('Haushalt A (oben)')).toBeVisible()
  await expect(page.getByText('Neu / unentschieden')).toBeVisible()
  await expect(page.getByText('Haushalt B (unten)')).toBeVisible()
})

test('verschiebt auch ohne Geste: antippen, dann Zielbahn bestaetigen', async ({ page }) => {
  const before = await laneCount(page, 'Haushalt A (oben)')

  await page.getByText('I1', { exact: true }).click()
  await page
    .locator('section', { hasText: 'Haushalt A (oben)' })
    .first()
    .getByRole('button', { name: 'hierhin' })
    .click()

  expect(await laneCount(page, 'Haushalt A (oben)')).toBe(before + 1)
})

for (const pointerType of ['mouse', 'touch'] as const) {
  test.describe(`Zeiger: ${pointerType}`, () => {
    test('verschiebt sofort, ohne Stillhalten (Voreinstellung)', async ({ page }) => {
      // Der Fall, den echte Nutzer produzieren: druecken und gleich ziehen.
      const before = await laneCount(page, 'Haushalt A (oben)')

      await pointerDrag(
        page,
        page.getByText('I1', { exact: true }),
        page.locator('section', { hasText: 'Haushalt A (oben)' }).first(),
        { pointerType, holdMs: 0 },
      )

      expect(await laneCount(page, 'Haushalt A (oben)')).toBe(before + 1)
    })

    test('verlangt mit eingeschalteter Verzoegerung ein Stillhalten', async ({ page }) => {
      // Dokumentiert, warum die Verzoegerung NICHT die Voreinstellung ist: wer
      // sofort losbewegt, loest nichts aus - das fuehlt sich wie ein Defekt an.
      await page.getByRole('button', { name: '250 ms' }).click()

      const before = await laneCount(page, 'Haushalt A (oben)')

      await pointerDrag(
        page,
        page.getByText('I1', { exact: true }),
        page.locator('section', { hasText: 'Haushalt A (oben)' }).first(),
        { pointerType, holdMs: 0 },
      )
      expect(await laneCount(page, 'Haushalt A (oben)')).toBe(before)

      await pointerDrag(
        page,
        page.getByText('I1', { exact: true }),
        page.locator('section', { hasText: 'Haushalt A (oben)' }).first(),
        { pointerType, holdMs: 400 },
      )
      expect(await laneCount(page, 'Haushalt A (oben)')).toBe(before + 1)
    })
  })
}
