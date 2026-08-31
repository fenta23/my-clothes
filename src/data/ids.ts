/**
 * ID-Erzeugung an einer Stelle gebuendelt.
 *
 * `crypto.randomUUID` gibt es nur in sicheren Kontexten. Die App laeuft zwar immer
 * ueber HTTPS, aber ein Fehlschlag hier wuerde das Anlegen von Kleidung verhindern -
 * das ist ein Fallback wert.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
