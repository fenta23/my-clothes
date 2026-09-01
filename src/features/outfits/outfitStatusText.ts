import type { OutfitStatus } from '../../store/selectors.ts'

/**
 * Formuliert in einem Satz, wo die Teile eines Outfits gerade liegen.
 *
 * Bewusst eine reine Funktion: das ist der eigentliche Gewinn der Outfits - die App
 * weiss als einzige, wo jedes Stueck ist - und die Formulierung soll pruefbar sein,
 * ohne eine Komponente zu rendern. Nach dem Vorbild von `describeEvent`.
 */
export function outfitStatusText(status: OutfitStatus): string {
  if (status.gesamt === 0) return 'Noch keine Teile ausgewählt'

  const [einziger] = status.jeHaushalt

  if (status.jeHaushalt.length === 1 && einziger) {
    return einziger.ref === null
      ? `${teile(einziger.anzahl)} noch nicht zugeordnet`
      : `Komplett bei ${einziger.name}`
  }

  // Verteilt: dann ist die Verteilung selbst die Antwort.
  return status.jeHaushalt.map((ort) => `${ort.anzahl} bei ${ort.name}`).join(' · ')
}

function teile(anzahl: number): string {
  return anzahl === 1 ? '1 Teil ist' : `${anzahl} Teile sind`
}
