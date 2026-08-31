# Kleiderschrank

Installierbare Web-App (PWA), mit der Kleidungsstücke per Foto erfasst,
kategorisiert und zwischen zwei Haushalten hin- und hergeschoben werden.
Jeder Wechsel wird mit Zeitstempel protokolliert.

Alle Daten liegen lokal im Browser (IndexedDB) — kein Server, kein Konto.

## Entwicklung

```bash
npm install
npm run dev        # HTTPS, damit Service Worker und Installation auf dem iPhone funktionieren
npm run build
```

## Wichtig

Die Daten hängen am **Origin** (der URL). Ändert sich die Domain, sind die Daten weg.
Deshalb gibt es in den Einstellungen einen Export als ZIP — regelmäßig nutzen.
