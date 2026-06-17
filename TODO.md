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
- ✅ `summary` + `genres` für alle 87 Acts ergänzt. Quelle: Beschreibungstexte
  von den jeweiligen southside.de-Act-Seiten (Div `m0150_lineupdetail__text`),
  zu sachlichen 1-Satz-Summaries destilliert.
- ✅ `genres` in der KI-Empfehlung verdrahtet: `netlify/functions/recommend.js`
  reicht das `genres`-Array jetzt ans Modell durch (primäres Match-Signal,
  Fallback Bandname nur noch bei leerem/`null`-Feld).

## Offene Punkte / Hinweise

- **2 Acts ohne `summary`/`genres` (`null`):** `ORVILLE PECK` und `ZIMT & ZORN`
  hatten auf ihrer southside.de-Act-Seite (noch) keinen Beschreibungstext.
  Sobald dort Text steht, nachtragen – `null` ist bewusst gesetzt, nichts erfunden.
- Die statische Seite funktioniert weiter; zusätzliche Felder
  (`url`/`summary`/`genres`) ignoriert das Frontend bisher – optional später
  in der UI anzeigen (z. B. `summary` als Tooltip/Detailzeile, `genres` als Tags).
- Die `genres`-Tags enthalten teils präzisere Werte als die App-Genres
  (z. B. `Nu-Metal`, `Post-Hardcore`, `Shoegaze`, `Ska`, `Schlager`,
  `Hyperpop`, `Garage`, `Trap`, `Dubstep`, `R&B`, `Brass`, `Folk`, `Soul`,
  `Dance`, `House`, `Techno`, `Metalcore`, `Pop-Punk`, `Post-Punk`). Falls die
  UI-Genre-Auswahl strikt auf die App-Genres mappen soll, hier ggf. ein
  Mapping/Filter ergänzen.
