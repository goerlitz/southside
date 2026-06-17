// Southside Timetable — static, data-driven view.
// The single source of truth is data/timetable.json. Nothing is hard-coded here.

const DATA_URL = "data/timetable.json";

// Netlify Function endpoint that builds the personal timetable.
// The OpenAI API key lives ONLY in the Netlify Function's environment — never here.
const AI_ENDPOINT =
  "https://southsiderec.netlify.app/.netlify/functions/recommend";

// Preferred order for the main genres; any further genres found in the
// timetable data (e.g. Techno, Shoegaze, Ska) are appended alphabetically so
// the filter always covers every genre that appears in the band descriptions.
const GENRE_ORDER = [
  "Rock",
  "Indie",
  "Pop",
  "Punk",
  "Metal",
  "Hip-Hop",
  "Electronic",
  "Alternative",
  "Singer-Songwriter",
  "Hardcore",
];

const els = {
  dayNav: document.getElementById("day-nav"),
  stageNav: document.getElementById("stage-nav"),
  schedule: document.getElementById("schedule"),
  meta: document.getElementById("festival-meta"),
  source: document.getElementById("source-note"),
  genreTags: document.getElementById("genre-tags"),
  generateBtn: document.getElementById("generate-btn"),
  personalStatus: document.getElementById("personal-status"),
  personalResult: document.getElementById("personal-result"),
};

// activeStage === null means "Alle" (no stage filter).
let state = { data: null, activeDay: 0, activeStage: null, selectedGenres: new Set() };

init();

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    render();
  } catch (err) {
    els.schedule.innerHTML =
      '<p class="error">Timetable konnte nicht geladen werden. ' +
      "Bitte die Seite über einen Webserver (z. B. GitHub Pages) öffnen.</p>";
    console.error(err);
  }
}

function render() {
  const data = state.data;
  const days = Array.isArray(data.days) ? data.days : [];

  // Header meta
  els.meta.textContent = [data.festival, data.location].filter(Boolean).join(" · ");

  // Source note in footer
  if (data.source) {
    const retrieved = data.retrieved_at ? ` (abgerufen am ${data.retrieved_at})` : "";
    els.source.textContent = `Quelle: ${data.source}${retrieved}`;
  }

  // Day buttons (weekday only, no date)
  els.dayNav.innerHTML = "";
  days.forEach((day, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-btn";
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = day.day || `Tag ${idx + 1}`;
    btn.addEventListener("click", () => selectDay(idx));
    els.dayNav.appendChild(btn);
  });

  renderStageFilter();
  renderGenreTags();
  els.generateBtn.addEventListener("click", generatePersonal);

  if (days.length) {
    selectDay(0);
  } else {
    els.schedule.innerHTML = '<p class="empty">Noch keine Timetable-Daten vorhanden.</p>';
  }
}

// Preferred order for known stages; anything else is appended alphabetically.
const STAGE_ORDER = ["Green Stage", "Blue Stage", "Red Stage", "White Stage"];

function uniqueStages() {
  const set = new Set();
  for (const day of state.data.days || []) {
    for (const p of day.performances || []) {
      if (p.stage) set.add(p.stage);
    }
  }
  return [...set].sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a);
    const ib = STAGE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
}

function renderStageFilter() {
  els.stageNav.innerHTML = "";
  const stages = uniqueStages();

  // "Alle" button (value null), then one button per stage.
  addStageButton("Alle", null, "all");
  for (const stage of stages) {
    addStageButton(stageLabel(stage), stage, stageColorClass(stage));
  }
}

function addStageButton(label, value, colorClass) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `stage-btn stage-${colorClass}`;
  btn.textContent = label;
  btn.setAttribute("aria-pressed", state.activeStage === value ? "true" : "false");
  btn.addEventListener("click", () => selectStage(value));
  els.stageNav.appendChild(btn);
}

function selectStage(value) {
  state.activeStage = value;
  renderStageFilter(); // refresh pressed states
  renderSchedule();
}

function selectDay(index) {
  state.activeDay = index;
  [...els.dayNav.children].forEach((btn, i) => {
    btn.setAttribute("aria-pressed", i === index ? "true" : "false");
  });
  renderSchedule();
}

function renderSchedule() {
  const day = state.data.days[state.activeDay];
  let performances = Array.isArray(day.performances) ? [...day.performances] : [];

  if (state.activeStage) {
    performances = performances.filter((p) => p.stage === state.activeStage);
  }

  // Chronological sort by start time (entries without a start time go last)
  performances.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  els.schedule.innerHTML = "";
  if (!performances.length) {
    els.schedule.innerHTML =
      '<p class="empty">Für diese Auswahl liegen keine Spielzeiten vor.</p>';
    return;
  }
  for (const p of performances) {
    els.schedule.appendChild(renderEntry(p));
  }
}

function renderEntry(p) {
  return makeEntry(p.start, p.end, p.stage, p.band);
}

// Builds an .entry showing only time, stage and band — used by both the
// day timetable and the personal timetable.
function makeEntry(start, end, stageName, bandName) {
  const el = document.createElement("article");
  el.className = "entry";

  const time = document.createElement("div");
  // Colour the time to match its stage.
  time.className = `entry-time time-${stageColorClass(stageName || "")}`;
  time.textContent = formatTimeRange(start, end);

  const band = document.createElement("div");
  band.className = "entry-band";
  band.textContent = bandName || "—";

  const stage = document.createElement("div");
  stage.className = "entry-stage";
  stage.textContent = stageName || "—";

  el.append(time, band, stage);
  return el;
}

// --- Personal timetable ---

// Genres from the data, ordered by GENRE_ORDER first, then alphabetically.
function uniqueGenres() {
  const set = new Set(GENRE_ORDER);
  for (const day of state.data.days || []) {
    for (const p of day.performances || []) {
      if (Array.isArray(p.genres)) {
        for (const g of p.genres) {
          if (g) set.add(g);
        }
      }
    }
  }
  return [...set].sort((a, b) => {
    const ia = GENRE_ORDER.indexOf(a);
    const ib = GENRE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
}

function renderGenreTags() {
  els.genreTags.innerHTML = "";
  for (const genre of uniqueGenres()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "genre-tag";
    btn.textContent = genre;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => toggleGenre(genre, btn));
    els.genreTags.appendChild(btn);
  }
}

function toggleGenre(genre, btn) {
  if (state.selectedGenres.has(genre)) {
    state.selectedGenres.delete(genre);
    btn.setAttribute("aria-pressed", "false");
  } else {
    state.selectedGenres.add(genre);
    btn.setAttribute("aria-pressed", "true");
  }
}

async function generatePersonal() {
  const selectedGenres = [...state.selectedGenres];

  if (!selectedGenres.length) {
    setPersonalStatus("Bitte wähle mindestens ein Genre aus.", "error");
    return;
  }
  if (AI_ENDPOINT.includes("YOUR-NETLIFY-SITE")) {
    setPersonalStatus(
      "AI_ENDPOINT ist noch nicht konfiguriert. Trage in script.js deine Netlify-Site-URL ein.",
      "error"
    );
    return;
  }

  els.personalResult.innerHTML = "";
  els.generateBtn.disabled = true;
  setPersonalStatus("Persönlicher Timetable wird erstellt …", "loading");

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedGenres, timetable: state.data }),
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch (_) {
      /* non-JSON response handled below */
    }

    if (!res.ok) {
      const msg =
        (payload && payload.error) || `Anfrage fehlgeschlagen (HTTP ${res.status}).`;
      throw new Error(msg);
    }
    if (!payload || !Array.isArray(payload.days)) {
      throw new Error("Unerwartete Antwort vom Server.");
    }

    renderPersonal(payload.days);
    setPersonalStatus("", "");
  } catch (err) {
    setPersonalStatus(`Fehler: ${err.message}`, "error");
    console.error(err);
  } finally {
    els.generateBtn.disabled = false;
  }
}

function renderPersonal(days) {
  els.personalResult.innerHTML = "";

  const withActs = days.filter(
    (d) => Array.isArray(d.performances) && d.performances.length
  );
  if (!withActs.length) {
    setPersonalStatus("Keine passenden Auftritte gefunden.", "error");
    return;
  }

  for (const day of withActs) {
    const heading = document.createElement("h3");
    heading.className = "personal-day";
    heading.textContent = [day.label, day.date].filter(Boolean).join(" · ");
    els.personalResult.appendChild(heading);

    const list = document.createElement("div");
    list.className = "schedule";
    const perfs = [...day.performances].sort(
      (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
    );
    for (const p of perfs) {
      list.appendChild(makeEntry(p.startTime, p.endTime, p.stage, p.band));
    }
    els.personalResult.appendChild(list);
  }
}

function setPersonalStatus(text, kind) {
  els.personalStatus.className = "personal-status" + (kind ? ` ${kind}` : "");
  els.personalStatus.textContent = "";
  if (kind === "loading") {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    els.personalStatus.appendChild(spinner);
  }
  if (text) {
    els.personalStatus.appendChild(document.createTextNode(text));
  }
}

// --- helpers ---

function stageLabel(stage) {
  // "Green Stage" -> "Green"; otherwise the full name.
  return stage.replace(/\s*Stage$/i, "").trim() || stage;
}

function stageColorClass(stage) {
  const s = stage.toLowerCase();
  if (s.includes("green")) return "green";
  if (s.includes("blue")) return "blue";
  if (s.includes("red")) return "red";
  if (s.includes("white")) return "white";
  return "all";
}

function formatTimeRange(start, end) {
  if (!start && !end) return "–";
  if (start && end) return `${start}–${end}`;
  return start || end;
}

function toMinutes(time) {
  // Sort key. Missing times sort to the end. Times before ~06:00 are treated
  // as after-midnight slots so late-night sets stay at the bottom.
  if (!time || typeof time !== "string") return Number.MAX_SAFE_INTEGER;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  if (parseInt(m[1], 10) < 6) mins += 24 * 60;
  return mins;
}
