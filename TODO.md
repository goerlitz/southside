# TODO – nächste Schritte

Aufgreifbar durch eine neue Claude-Code-Web-Session.

## Ziel

Für **jede Band** in `data/timetable.json` ergänzen:
- `summary` – eine knappe, **sachliche** Beschreibung (1 Satz), **ohne Musik-Journalisten-Geschwafel**.
- `genres` – Array passender Genre-Tags (idealerweise inkl. der App-Genres:
  Rock, Indie, Pop, Punk, Metal, Hip-Hop, Electronic, Alternative,
  Singer-Songwriter, Hardcore – ergänzt um präzisere Tags wo sinnvoll).

Bei fehlenden/unsicheren Infos: **`null` statt erfinden** (Projektprinzip „erfinde nichts").

## Stand (erledigt)

- ✅ Timetable gegen die offizielle Line-Up-Seite (`southside.de/line-up/?view=all`)
  geprüft: alle 87 Acts, Tag/Start/Ende/Stage stimmen exakt überein.
- ✅ `url` je Band ergänzt (`https://southside.de/line-up/act/<slug>/`).
- ⏳ `summary` + `genres` fehlen noch.

## Blocker (wichtig)

Diese Session hatte **keinen Netzwerkzugriff auf southside.de**
(`curl` → „Host not in allowlist", WebFetch global geblockt). Die Egress-Policy
wird beim Erstellen der Umgebung gesetzt.

**Voraussetzung für Schritt 1 unten:**
1. In den **Network-Egress-Einstellungen** der Umgebung `southside.de`
   (und `www.southside.de`) zur Allowlist hinzufügen.
2. Eine **neue** Session/Umgebung starten (sonst greift die Allowlist nicht).

## Schritt 1 – echte Daten von southside.de (bevorzugt)

In der neuen Session, sobald `southside.de` erreichbar ist:

1. Für jede `url` in `data/timetable.json` die Act-Seite per `curl` holen.
2. Aus dem Beschreibungstext eine **knappe, sachliche** `summary` formulieren
   (Herkunft, Stil, ggf. ein markanter Fakt – keine Werbe-/Journalisten-Floskeln).
3. `genres` aus dem Text/Stil ableiten.
4. Felder `summary` und `genres` in jedes `performances[]`-Objekt eintragen
   (neben `band`, `stage`, `start`, `end`, `url`).
5. JSON validieren, direkt auf `main` committen und pushen.

Kurz-Check der Erreichbarkeit:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://southside.de/line-up/act/billy-talent/
# 200 = ok; 403 "Host not in allowlist" = Egress noch nicht freigeschaltet
```

## Schritt 1b – Fallback ohne Netzzugriff

Falls southside.de weiterhin nicht erreichbar ist: `summary` + `genres` aus
Modellwissen erzeugen – für bekannte Acts zuverlässig, für unsichere Bands
`null` setzen. Später aus southside.de ergänzen.

## Hinweise

- Die statische Seite muss weiter funktionieren; zusätzliche Felder
  (`url`/`summary`/`genres`) ignoriert das Frontend bisher – optional später
  in der UI anzeigen.
- `genres` im JSON verbessern die KI-Empfehlung
  (`netlify/functions/recommend.js` leitet Genres sonst nur aus dem Bandnamen ab).
- Commits ab jetzt **direkt auf `main`** (so vom Nutzer gewünscht).
- Die zuvor hochgeladene `.mhtml`-Datei ist in einer neuen Session **nicht**
  mehr vorhanden – die benötigten URLs stehen aber bereits in
  `data/timetable.json`.
