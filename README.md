# SUSHI / 26

Wahlkampf-Website von Benjamin „Sushi“ Suljic, Kandidat für Schulsprecher an der HTL Hollabrunn.
Next.js 16 · React 19 · TypeScript · CSS Modules · Supabase (Wettbewerb). Läuft als statische Seite auf GitHub Pages.

## Starten

```bash
npm install
npm run dev        # http://localhost:3000 (mit Text-Editor)
npm run build      # statische Website in out/ (für GitHub Pages)
npm start          # out/ lokal ansehen
```

## Veröffentlichen auf GitHub Pages

Der Workflow `.github/workflows/pages.yml` baut die Seite bei jedem Push auf `main` und stellt sie online.

1. Repo auf GitHub anlegen und den Code pushen (Branch `main`).
2. Repo → **Settings → Pages** → *Source*: **GitHub Actions**.
3. Repo → **Settings → Secrets and variables → Actions** → *New repository secret*, zweimal:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL aus Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/publishable Key (**nie** den service_role/secret Key!)
4. Repo → **Actions** → „GitHub Pages“ → *Run workflow* (oder einfach etwas pushen).
   Die Adresse steht danach unter Settings → Pages (`https://<name>.github.io/<repo>/`).

Der Unterordner `/<repo>/` wird automatisch erkannt (Bilder/Audio über `src/lib/asset.ts`).
`scripts/fix-export.mjs` läuft nach jedem Build und ergänzt Dateien, die GitHub Pages sonst als 404 meldet.
Die Original-Fotos liegen in `bilder/` (1.png–4.png) und werden absichtlich **nicht** hochgeladen (`.gitignore`).

## Inhalte bearbeiten

**Am einfachsten:** `npm run dev` starten, rechts unten auf **„✎ TEXTE“** klicken, ändern, **Speichern** (oder Strg+S).
Die Seite aktualisiert sich sofort. Das Menü gibt es nur lokal im Dev-Modus.

> TEMPORÄR — vor dem Veröffentlichen entfernen: `src/components/editor/`, `src/app/api/texte/` (nur im Dev-Modus aktiv)
> und in `src/app/layout.tsx` die Zeilen `import DevEditor …` und `<DevEditor />`.

Alle Texte liegen in `src/content/` und können auch direkt bearbeitet werden:

| Datei | Inhalt |
| --- | --- |
| `texts.json` | Alle Seitentexte, nach Seite gegliedert. |
| `profile.json` | Deine Daten. **Leere Felder (`""`) erscheinen als gelb-gestreifter Platzhalter.** |
| `promises.json` | Die 6 Versprechen (Inhalt aus `Hallo,.txt`). |
| `videos.json` | Videos. Bei `youtubeId` einfach den YouTube-Link einfügen. |

## Seiten

`/` · `/about` · `/promises` · `/videos` · `/games` · `/wettbewerb` · `/balls-destroyer` · `/wieso` (unendlicher Ladebildschirm)

## Wettbewerb „Verunstalte mich!“ (`/wettbewerb`)

SUSHI PAINT (`src/components/paint/`) + Einsendungen über Supabase (`src/lib/supabase.ts`).

1. **Fotos:** `public/wettbewerb/foto-1.jpg` … `foto-3.jpg` ablegen (genau diese Namen, JPG).
2. **Supabase-Projekt** anlegen → *SQL Editor* → Inhalt von `supabase/wettbewerb.sql` einfügen → *Run*.
3. **Zugangsdaten:** `.env.local.example` zu `.env.local` kopieren, URL + anon/publishable Key eintragen
   (Dashboard → *Project Settings* → *API*). Dev-Server neu starten. Beim Hosting dieselben 2 Variablen setzen.
4. **Freigeben:** Dashboard → *Table Editor* → `einsendungen`. Bild ansehen unter *Storage* → `einsendungen`
   (Dateiname = `bild_pfad`). `status` auf `freigegeben` setzen → erscheint in der Hall of Fame.
   Gewinner: `platz` = 1, 2, 3. Unpassendes: `status` = `abgelehnt` oder Zeile + Datei löschen.

- Pflicht beim Einsenden: Künstlername (wird als Signatur ins Bild geschrieben) + E-Mail.
  Jede E-Mail nur einmal (Datenbank), zusätzlich merkt sich der Browser die Teilnahme.
- **Bildgröße…** im Malprogramm: Breite/Höhe ändern (16–1200 px), entweder das Bild strecken oder die Leinwand
  vergrößern/zuschneiden. Rückgängig geht auch hier.
- Bilder werden im Browser komprimiert (WebP, max. 800 px, Ziel < 250 KB; JPEG, falls kein WebP).
  Hochskalierte Bilder werden dafür wieder auf 800 px verkleinert.
- Besucher können nur einsenden und nur freigegebene Bilder sehen – E-Mail-Adressen nie (Spaltenrechte).
- Nach dem Wettbewerb (DSGVO): `supabase/nach-dem-wettbewerb.sql` im SQL Editor ausführen. Löscht alle nicht freigegebenen
  Einsendungen und alle E-Mail-Adressen (Hall of Fame bleibt). Die Bilddateien der gelöschten Einsendungen danach unter
  *Storage* → `einsendungen` von Hand löschen. **Erst nach der Preisübergabe**, vorher brauchst du die E-Mails der Gewinner.

## Datenschutz & Impressum (`/datenschutz`, `/impressum`)

Texte + deine Angaben im Bearbeitungsmenü unter „Datenschutz“. Pflicht: **Wohnort** und **Kontakt-E-Mail**,
sobald online auch den **Hosting-Anbieter**. Platzhalter wie `{kontaktEmail}` in den Texten werden automatisch ersetzt.
Kein Tracking, keine Cookies, Schriften lokal, YouTube lädt erst nach Klick.

## Eier-Zerstörer (`/balls-destroyer`)

- Ziel: **02.10.2026, 00:00:00 Wiener Zeit** (`src/lib/countdown.ts`, `TARGET_ISO`). Mit festem Offset `+02:00`,
  also für jede Zeitzone derselbe Moment.
- Jede Sekunde wird `Ziel − jetzt` neu berechnet — nie heruntergezählt. Läuft auch nach Stunden offen korrekt.
- Glocke (`public/audio/bell.mp3`) läutet einmal pro voller Stunde, genau wenn die Anzeige `XX:00:00` erreicht.
  Kein Läuten beim Laden/Refresh; mehrere Tabs läuten nicht doppelt (letzte Stunde steht in `localStorage`).
- Sound ist standardmäßig aus („GLOCKE AKTIVIEREN“), Browser verlangen vorher einen Klick. Die Einstellung wird gespeichert.
- **Testen:** `/balls-destroyer?simulate=3605` tut so, als wären es noch 3605 Sekunden bis zum Ziel
  (Glocke nach 5 s, eigener Speicher, echter Zustand bleibt unberührt). `?simulate=5` zeigt das Finale.

## Easter Eggs

Nicht verraten. (Konami-Code. Logo. Tippen.)

## Barrierefreiheit & Performance

- `prefers-reduced-motion` schaltet Animationen, Parallax, Custom Cursor-Magnetismus und den Ladebildschirm ab.
- Custom Cursor nur auf Geräten mit Maus. Alle Buttons sind echte `<button>`s, Menü mit Escape/Fokus-Rückgabe.
- Animationen laufen über CSS-Transforms; JS-Loops (Cursor, Spiel) laufen nur, solange sie gebraucht werden.
