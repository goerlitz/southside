// Southside Timetable — static, data-driven view.
// The single source of truth is data/timetable.json. Nothing is hard-coded here.

const DATA_URL = "data/timetable.json";

const els = {
  nav: document.getElementById("day-nav"),
  schedule: document.getElementById("schedule"),
  meta: document.getElementById("festival-meta"),
  source: document.getElementById("source-note"),
};

let state = { data: null, activeDay: null };

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
  const metaParts = [data.festival, data.location].filter(Boolean);
  els.meta.textContent = metaParts.join(" · ");

  // Source note in footer
  if (data.source) {
    const retrieved = data.retrieved_at
      ? ` (abgerufen am ${data.retrieved_at})`
      : "";
    els.source.textContent = `Quelle: ${data.source}${retrieved}`;
  }

  // Day buttons
  els.nav.innerHTML = "";
  days.forEach((day, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-btn";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML =
      `<span class="day-name">${escapeHtml(day.day || `Tag ${idx + 1}`)}</span>` +
      (day.date ? `<span class="day-date">${escapeHtml(formatDate(day.date))}</span>` : "");
    btn.addEventListener("click", () => selectDay(idx));
    els.nav.appendChild(btn);
  });

  // Auto-select the first day if available
  if (days.length) {
    selectDay(0);
  } else {
    els.schedule.innerHTML =
      '<p class="empty">Noch keine Timetable-Daten vorhanden.</p>';
  }
}

function selectDay(index) {
  state.activeDay = index;

  // Toggle button states
  [...els.nav.children].forEach((btn, i) => {
    btn.setAttribute("aria-pressed", i === index ? "true" : "false");
  });

  const day = state.data.days[index];
  const performances = Array.isArray(day.performances)
    ? [...day.performances]
    : [];

  // Chronological sort by start time (entries without a start time go last)
  performances.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  els.schedule.innerHTML = "";
  if (!performances.length) {
    els.schedule.innerHTML =
      '<p class="empty">Für diesen Tag liegen noch keine Spielzeiten vor.</p>';
    return;
  }

  for (const p of performances) {
    els.schedule.appendChild(renderEntry(p));
  }
}

function renderEntry(p) {
  const el = document.createElement("article");
  el.className = "entry";

  const time = document.createElement("div");
  time.className = "entry-time";
  time.textContent = formatTimeRange(p.start, p.end);

  const band = document.createElement("div");
  band.className = "entry-band";
  band.textContent = p.band || "—";

  const stage = document.createElement("div");
  stage.className = "entry-stage";
  stage.textContent = p.stage || "—";

  el.append(time, band, stage);
  return el;
}

// --- helpers ---

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

function formatDate(iso) {
  // Accepts YYYY-MM-DD, returns a short German date. Falls back to raw value.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("de-DE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
