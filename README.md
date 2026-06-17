# Southside Timetable

Statische GitHub-Pages-Website zur Übersicht des [Southside-Festival](https://southside.de)-Timetables.

Reines HTML, CSS und JavaScript – kein Framework, kein npm, kein Build-Step, keine Server-Komponente. Die Seite lädt ihre Daten ausschließlich aus `data/timetable.json`.

## Funktionen

- Header mit Logo und Titel „Southside Timetable"
- Buttons für die Festivaltage
- Klick auf einen Tag zeigt alle Bands dieses Tages **chronologisch** sortiert
- Pro Eintrag werden ausschließlich **Zeit, Stage und Bandname** angezeigt
- Exklusiver **Stage-Filter** (Alle/Green/Blue/Red/White)
- **Personal Timetable** per KI (siehe unten) – optional über eine Netlify Function
- Mobil optimiert

## Datenquelle

- **Quelle:** Offizieller Timetable von [southside.de](https://southside.de) (manuell aus dem veröffentlichten Timetable übernommen).
- **Abgerufen am:** siehe Feld `retrieved_at` in `data/timetable.json`.
- Es werden **keine Werte erfunden**. Fehlende Angaben (z. B. unbekannte Endzeit) stehen als `null` in den Daten.

## JSON-Struktur

`data/timetable.json` ist die einzige Datenquelle:

```json
{
  "festival": "Southside Festival 2026",
  "location": "Take-Off Park, Neuhausen ob Eck",
  "source": "https://southside.de/... (Timetable)",
  "retrieved_at": "2026-06-17",
  "days": [
    {
      "day": "Freitag",
      "date": "2026-06-19",
      "performances": [
        {
          "band": "Bandname",
          "stage": "Blue Stage",
          "start": "20:30",
          "end": "21:45"
        }
      ]
    }
  ]
}
```

Felder pro Auftritt (`performances[]`):

| Feld    | Typ            | Bedeutung                                  |
| ------- | -------------- | ------------------------------------------ |
| `band`  | string         | Bandname                                   |
| `stage` | string         | Bühne / Stage                              |
| `start` | string `HH:MM` | Startzeit                                  |
| `end`   | string `HH:MM` \| null | Endzeit, `null` wenn nicht verfügbar |

Felder pro Tag (`days[]`):

| Feld           | Typ                    | Bedeutung                          |
| -------------- | ---------------------- | ---------------------------------- |
| `day`          | string                 | Festivaltag (z. B. „Freitag")      |
| `date`         | string `YYYY-MM-DD` \| null | Datum, `null` wenn nicht verfügbar |
| `performances` | array                  | Auftritte des Tages                |

> Hinweis zur Sortierung: Set-Zeiten vor ca. 06:00 werden als After-Midnight-Slots behandelt, damit späte Nacht-Acts korrekt ans Ende des Tages sortiert werden.

## Daten aktualisieren

1. Aktuellen Timetable auf [southside.de](https://southside.de) öffnen.
2. Pro Auftritt einen Eintrag in das passende `days[].performances`-Array von `data/timetable.json` eintragen (Bandname, Stage, Start, Endzeit).
3. `source` und `retrieved_at` aktualisieren.
4. Datei speichern – die Website übernimmt die Daten automatisch (Sortierung und Tagesbuttons werden aus den Daten generiert).

Es ist kein Build nötig.

## Lokal testen

Wegen `fetch()` muss die Seite über einen Webserver (nicht per `file://`) geöffnet werden:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 im Browser öffnen
```

Auf GitHub Pages läuft die Seite direkt aus dem Repo-Root ohne weitere Konfiguration.

## Deployment (GitHub Pages)

1. Repository-Einstellungen → **Pages**.
2. Source: **Deploy from a branch**, Branch `main` (bzw. der gemergte Branch), Ordner `/ (root)`.
3. Speichern – die Seite ist anschließend unter der angezeigten Pages-URL erreichbar.

## Personal Timetable (Netlify Function)

Zusätzlich zur statischen Tagesansicht gibt es einen **„Personal Timetable"**:
Man wählt Genres (Rock, Indie, Pop, Punk, Metal, Hip-Hop, Electronic,
Alternative, Singer-Songwriter, Hardcore) und erhält per KI einen persönlichen,
möglichst überschneidungsfreien Timetable pro Festivaltag (Anzeige: nur Zeit,
Stage, Bandname).

Die statische Seite bleibt unverändert auf GitHub Pages lauffähig. Nur der
KI-Aufruf läuft über eine **Netlify Function** (`netlify/functions/recommend.js`).

### Sicherheit (wichtig)

> Der OpenAI-API-Key wird **ausschließlich** in der Netlify Function aus
> `process.env.OPENAI_API_KEY` gelesen. Er darf **niemals** in Frontend-JS, HTML,
> JSON, README-Beispielen oder committetem Code stehen.

### Architektur

- **Frontend** (`index.html` / `script.js` / `style.css`): lädt wie bisher
  `data/timetable.json`, zeigt Genre-Tags + Button und schickt einen `POST` an
  den KI-Endpoint.
- **Backend** (`netlify/functions/recommend.js`): liest den Key aus der
  Umgebung, ruft die OpenAI Responses API auf, validiert Request **und** Antwort
  und gibt striktes JSON zurück. CORS-Header erlauben den Aufruf von der
  GitHub-Pages-Domain.

Monorepo – kein separates Backend-Repo, kein npm/Build-Step nötig
(`recommend.js` ist reines CommonJS und nutzt das eingebaute `fetch` der
Node-18-Runtime).

### Endpoint im Frontend setzen

In `script.js` die Konstante auf die eigene Netlify-Site anpassen:

```js
const AI_ENDPOINT = "https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/recommend";
```

### Request / Response

Request (`POST`, JSON):

```json
{
  "selectedGenres": ["Rock", "Punk"],
  "timetable": { "...": "Inhalt von data/timetable.json" }
}
```

Response (JSON):

```json
{
  "days": [
    {
      "id": "friday",
      "label": "Friday",
      "date": "2026-06-19",
      "performances": [
        { "startTime": "16:30", "endTime": "17:30", "stage": "Green Stage", "band": "Band Name" }
      ]
    }
  ]
}
```

Fehler werden als JSON mit Feld `error` (und ggf. `detail`) zurückgegeben, z. B.
`400` bei ungültigem Request, `500` wenn `OPENAI_API_KEY` fehlt, `502` bei einem
fehlgeschlagenen oder ungültigen KI-Aufruf.

### Netlify einrichten

1. Netlify-Site mit diesem Repo verbinden (Functions-Verzeichnis ist in
   `netlify.toml` als `netlify/functions` gesetzt).
2. In den Netlify-**Environment variables** setzen:
   - `OPENAI_API_KEY` = dein OpenAI-Key *(geheim, nur hier)*
   - optional `OPENAI_MODEL` (Default `gpt-4o-mini`)
   - optional `ALLOWED_ORIGIN` = deine GitHub-Pages-URL (Default `*`)
3. Deployen. Die Function ist dann unter
   `https://<deine-site>.netlify.app/.netlify/functions/recommend` erreichbar.
4. `AI_ENDPOINT` in `script.js` auf genau diese URL setzen, committen, pushen.

### Lokal testen (optional)

Mit der Netlify CLI lässt sich die Function lokal ausführen:

```bash
npm install -g netlify-cli   # einmalig
export OPENAI_API_KEY=sk-...  # nur in der Shell, nicht committen
netlify dev                   # serviert Seite + Function lokal
```
