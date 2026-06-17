# Southside Timetable

Statische GitHub-Pages-Website zur Übersicht des [Southside-Festival](https://southside.de)-Timetables.

Reines HTML, CSS und JavaScript – kein Framework, kein npm, kein Build-Step, keine Server-Komponente. Die Seite lädt ihre Daten ausschließlich aus `data/timetable.json`.

## Funktionen

- Header mit Logo und Titel „Southside Timetable"
- Buttons für die Festivaltage
- Klick auf einen Tag zeigt alle Bands dieses Tages **chronologisch** sortiert
- Pro Eintrag werden ausschließlich **Zeit, Stage und Bandname** angezeigt
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
