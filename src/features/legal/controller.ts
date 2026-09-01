/**
 * Angaben zum Verantwortlichen.
 *
 * Der Name kommt beim Bauen aus `VITE_CONTROLLER_NAME` und liegt damit nicht im
 * oeffentlichen Quelltext - auf der Seite selbst ist er natuerlich sichtbar, das
 * verlangt das Impressum ja gerade. Fehlt die Angabe, steht dort ein deutlicher
 * Platzhalter statt einer leeren Zeile: ein unvollstaendiges Impressum soll
 * auffallen, nicht unbemerkt bleiben.
 */
export const CONTROLLER_NAME: string =
  import.meta.env.VITE_CONTROLLER_NAME || '⚠️ VITE_CONTROLLER_NAME ist nicht gesetzt'

export const CONTACT_EMAIL = 'fenta23+kleiderschrank@gmail.com'

export const REPOSITORY_URL = 'https://github.com/fenta23/my-clothes'

export function isControllerConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CONTROLLER_NAME)
}
