/** Zeitpunkt in deutscher Schreibweise, z. B. „31.08.2026, 21:40". */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
