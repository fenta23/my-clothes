# Kleiderschrank

**Live:** https://fenta23.github.io/my-clothes/

Installierbare Web-App (PWA), mit der Kleidungsstücke per Foto erfasst,
kategorisiert und zwischen zwei Haushalten hin- und hergeschoben werden.
Jeder Wechsel wird mit Zeitstempel protokolliert.

Alle Daten liegen lokal im Browser (IndexedDB) — kein Server, kein Konto.

## Entwicklung

```bash
npm install
npm run dev            # HTTPS via selbstsigniertem Zertifikat
npm run build
npm run preview
```

| Befehl | Zweck |
| --- | --- |
| `npm test` | Unit-Tests einmalig |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run test:coverage` | Coverage-Report nach `coverage/` |
| `npm run typecheck` | TypeScript ohne Emit |
| `npm run lint` | oxlint |

### Warum HTTPS im Dev-Server

Service Worker und „Zum Home-Bildschirm" verweigern auf `http://192.168.x.x`
**lautlos** den Dienst — das sieht aus wie ein Manifest-Fehler, ist aber keiner.
Deshalb läuft der Dev-Server über `@vitejs/plugin-basic-ssl`. Das Zertifikat ist
selbstsigniert; auf dem iPhone muss die Warnung einmalig bestätigt werden.
Alternative ohne Warnung: ein Tunnel via `cloudflared tunnel --url https://localhost:5173`.

### Deployment

Jeder Push auf `main` laeuft durch GitHub Actions: Typecheck, Lint, Unit-Tests, Build —
und veroeffentlicht erst danach auf GitHub Pages. Pull Requests werden geprueft, aber
nicht veroeffentlicht.

Weil die App unter dem Unterpfad `/my-clothes/` liegt, ist `base` in `vite.config.ts`
gesetzt und Manifest-Scope sowie Service-Worker-Fallback zeigen darauf. Aendert sich der
Pfad, muss das an genau dieser einen Stelle nachgezogen werden.

### Test auf dem iPhone

Am einfachsten über die Live-URL — gültiges Zertifikat, damit funktioniert auch der
Service Worker. Lokal geht es ebenfalls:

1. `npm run dev` — Vite zeigt die Netzwerk-Adresse an, App liegt unter `/my-clothes/`
2. Am iPhone im selben WLAN öffnen, Zertifikatswarnung bestätigen
3. Teilen → **Zum Home-Bildschirm**
4. Ab jetzt die App **vom Home-Bildschirm** starten — nur dort gilt Standalone-Verhalten

Ein selbstsigniertes Zertifikat reicht **nicht** für den Service Worker: Safari lehnt die
Registrierung trotz bestätigter Warnung ab. Offline-Tests deshalb über die Live-URL.

## Wichtig: Datenhaltbarkeit

Die Daten hängen am **Origin** (der URL). Ändert sich die Domain, sind die Fotos weg.
Deshalb gibt es in den Einstellungen einen ZIP-Export — regelmäßig nutzen.
Die App fordert beim Start dauerhaften Speicher an (`navigator.storage.persist()`);
Safari gewährt das nicht garantiert, das Ergebnis steht im Systemcheck.
