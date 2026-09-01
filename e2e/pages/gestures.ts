import type { Locator, Page } from '@playwright/test'

export type PointerType = 'mouse' | 'touch'

/**
 * Zieht ein Element auf ein Ziel.
 *
 * Warum von Hand statt mit Playwrights `dragTo`: dnd-kit verwendet kein
 * HTML5-Drag-&-Drop, sondern Zeigerereignisse. Und `page.touchscreen` kennt nur
 * Tippen - auch in einem Touch-Projekt verschickt `page.mouse` weiterhin
 * Maus-Ereignisse. Ein damit gruener Test wuerde ueber das Verhalten auf dem
 * iPhone nichts beweisen.
 */
export async function pointerDrag(
  page: Page,
  source: Locator,
  target: Locator,
  pointerType: PointerType,
): Promise<void> {
  const start = await center(source)
  const end = await center(target)

  await page.evaluate(
    async ({ start, end, pointerType }) => {
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      const fire = (type: string, x: number, y: number) => {
        const element = document.elementFromPoint(x, y) ?? document.body
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            isPrimary: true,
            pointerType,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: y,
          }),
        )
      }

      fire('pointerdown', start.x, start.y)

      // In Schritten bewegen: ein einzelner Sprung sieht fuer Sensoren nicht
      // wie eine Geste aus.
      for (let step = 1; step <= 12; step += 1) {
        fire(
          'pointermove',
          start.x + ((end.x - start.x) * step) / 12,
          start.y + ((end.y - start.y) * step) / 12,
        )
        await sleep(16)
      }

      fire('pointerup', end.x, end.y)

      /*
       * Ein echter Browser schickt nach dem pointerup noch ein click-Ereignis.
       * dnd-kit haelt genau dafuer einen Abfang bereit, damit ein Ziehen nicht
       * als Klick durchschlaegt. Ohne dieses click bleibt der Abfang scharf und
       * verschluckt den naechsten echten Klick irgendwo in der App - ein
       * Artefakt der synthetischen Geste, kein Fehler der Anwendung.
       */
      const target = document.elementFromPoint(end.x, end.y) ?? document.body
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: end.x,
          clientY: end.y,
        }),
      )
    },
    { start, end, pointerType },
  )

  /*
   * Auf dnd-kits Aufraeumfenster warten.
   *
   * Beim Start eines Drags registriert der Sensor auf dem Dokument einen
   * click-Listener in der Capture-Phase, der stopPropagation aufruft - damit ein
   * Ziehen nicht zusaetzlich als Klick durchschlaegt. Entfernt wird er in
   * detach() erst nach `setTimeout(…, 50)`. Wer frueher klickt, dessen Klick
   * wird verschluckt.
   *
   * Fuer einen Menschen ist das unsichtbar: kein Finger wandert in 50 ms von
   * einer Karte zu einem anderen Knopf. Nur der Test ist schneller als jede
   * Hand. Das ist also kein Wartetrick gegen Flakiness, sondern das Abwarten
   * eines festen, dokumentierten Fensters der Bibliothek.
   */
  await page.waitForTimeout(120)
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element hat keine Ausdehnung')

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
