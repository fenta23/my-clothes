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

## Aufbau

Der Code ist in Feature-Slices geschnitten. Die Schichten von unten nach oben:

| Schicht | Inhalt | Darf kennen |
| --- | --- | --- |
| `shared/` | generische Bausteine: Store-Grundlage, Sheet-Rahmen, Datum, Plattform | nur sich selbst |
| `entities/` | Fachtypen und ihre Ablage in IndexedDB, je Entität ein Ordner | `shared` |
| `store/` | der gemeinsame Zustand, verbindet mehrere Entitäten | `entities`, `shared` |
| `features/` | fachliche Bausteine der Oberfläche | alles darunter |
| `app/` | setzt die Features zusammen | alles |

Zwei Regeln, die `src/architecture.test.ts` bei jedem Lauf prüft:

1. **Importe zeigen nur nach unten.**
2. **Ein Feature kennt kein anderes Feature.** Zusammengesetzt wird ausschließlich in
   `app/` — deshalb liegen `Wardrobe.tsx` und `SettingsSheet.tsx` dort und nicht in
   einem Feature.

Der Test ersetzt eine Lint-Regel, die oxlint nicht mitbringt. Ohne Zwang verfällt
jede Struktur wieder — es genügt ein bequemer Import.

### Warum ein eigener Store

Komponenten abonnieren über Selektoren gezielt einen Ausschnitt des Zustands. Vorher
hing die ganze Oberfläche an einem gemeinsamen Context: ein einziges neues Foto
rendert damit jede Karte, jedes Sheet und jeden Filter-Chip neu. `src/store/wardrobeStore.test.tsx`
hält das als Test fest — Kategorien dürfen sich nicht neu rendern, wenn Kleidung
hinzukommt.

## Updates

Der Service Worker läuft im Modus `prompt`, nicht `autoUpdate`. Grund: eine
Home-Screen-App navigiert nie — sie wird geöffnet und bleibt tagelang im Hintergrund.
Mit `autoUpdate` lädt der Browser zwar neue Dateien, die laufende App zeigt aber
weiter die alte Fassung, bis sie zufällig komplett neu startet.

Stattdessen fragt die App selbst nach (`src/features/app-update/updateChecks.ts`) —
und zwar bei **jedem** plausiblen Signal: `visibilitychange`, `pageshow`, `focus`,
`online`, sowie beim ersten Antippen nach einer Minute Ruhe.

Der Grund für diese Breite: mit `visibilitychange` allein kam die Meldung auf einem
iPhone nur, wenn die App vorher vollständig beendet war — aus dem Hintergrund heraus
nicht. WebKit feuert das Ereignis bei einer Standalone-App auf dem Weg zurück in den
Vordergrund offenbar nicht verlässlich. Das Antippen ist die letzte Sicherung: wer
die App bedient, ist ganz sicher da.

Zwei verschiedene Bremsen, weil die Signale verschieden sind: Lebenszyklus-Ereignisse
feuern im Bündel, deshalb wird nur keine zweite Abfrage gestartet, solange eine läuft.
Antippen passiert dutzendfach pro Minute und bekommt deshalb eine echte Sperrfrist.

Steht eine neue Fassung bereit, erscheint oben ein Banner „Neue Version verfügbar"
mit einem Knopf zum Neuladen. Bewusst kein selbsttätiges Neuladen: die App könnte
gerade mitten in der Aufnahme eines Fotos sein.

`e2e/update.spec.ts` prüft den Weg vollständig — es baut die App, liefert sie über
einen eigenen Server aus, täuscht durch eine veränderte `sw.js` eine
Neuveröffentlichung vor und erwartet Banner, Neuladen und den Erhalt der Daten.
Vier weitere Fälle prüfen, dass die App die Abfrage **selbst** auslöst, ohne dass der
Test `update()` aufruft — genau diese Lücke ließ den Fehler auf dem Gerät durchgehen.

## Menü und Rechtliches

Einstellungen, Datenschutz und Impressum liegen in einer Seitenleiste
(`src/app/MainMenu.tsx`), die von rechts einfährt und in sich selbst navigiert statt
Blätter zu stapeln.

Der Name des Verantwortlichen kommt beim Bauen aus `VITE_CONTROLLER_NAME` und steht
damit nicht im öffentlichen Quelltext. Lokal: `.env.example` nach `.env` kopieren.
Für den Deploy als Repository-Variable setzen:

```bash
gh variable set CONTROLLER_NAME --body "Vorname Nachname"
```

Fehlt die Angabe, zeigen beide Panels einen deutlich sichtbaren Warnhinweis — ein
unvollständiges Impressum soll auffallen, nicht als leere Zeile durchgehen.

## Bilder und Geschwindigkeit

Beim Import entstehen zwei Fassungen (`src/features/clothing-import/images.ts`):
Original auf **1600 px** lange Kante, Vorschau auf **400 px**, beide JPEG bei
Qualität 0.8. Die Bahnen laden ausschließlich die Vorschau; das Original wird nur
in der Detailansicht geholt.

Gemessen mit `e2e/performance.spec.ts` (WebKit auf einem Mac — ein iPhone 12 braucht
länger):

| | 200 Stücke | 500 Stücke |
| --- | --- | --- |
| Belegter Speicher | 28 MB | 70 MB |
| Laden bis alle Karten da | ~450 ms | ~520 ms |
| Reaktion auf Antippen | ~110 ms | ~150 ms |
| Geladene Bilder | 21 | 21 |

Die Zahlen stammen von synthetischen Bildern, die sich besser komprimieren als echte
Fotos — bei echten iPhone-Aufnahmen ist eher mit 250–400 KB je Original zu rechnen,
also rund 70 MB für 200 Stücke.

**Der entscheidende Punkt ist die letzte Zeile.** Ohne `loading="lazy"` an der Karte
lud und dekodierte der Browser *alle* Bilder, auch die weit außerhalb der Bahn — bei
jedem 400er-JPEG rund 640 KB dekodiert, also über 100 MB für Unsichtbares. Die
Ladezeit war dabei identisch: das Aufschieben kostet nichts und spart alles. Ein Test
sichert das ab, damit es nicht unbemerkt zurückfällt.

## Wichtig: Datenhaltbarkeit

Die Daten hängen am **Origin** (der URL). Ändert sich die Domain, sind die Fotos weg.
Deshalb gibt es in den Einstellungen einen ZIP-Export — regelmäßig nutzen.
Die App fordert beim Start dauerhaften Speicher an (`navigator.storage.persist()`);
Safari gewährt das nicht garantiert, das Ergebnis steht im Systemcheck.
