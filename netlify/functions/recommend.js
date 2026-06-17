// Netlify Function: POST /.netlify/functions/recommend
//
// Builds a personal festival timetable with the OpenAI Responses API.
// SECURITY: the OpenAI API key is read ONLY here, from process.env.OPENAI_API_KEY.
// It must never appear in frontend code, committed files, or responses.

const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Allowed CORS origin. Set ALLOWED_ORIGIN (e.g. your GitHub Pages URL) to lock
// it down; defaults to "*" so the static site can call this from any origin.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

// Strict schema the model must return.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          date: { type: "string" },
          performances: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                startTime: { type: "string" },
                endTime: { type: "string" },
                stage: { type: "string" },
                band: { type: "string" },
              },
              required: ["startTime", "endTime", "stage", "band"],
            },
          },
        },
        required: ["id", "label", "date", "performances"],
      },
    },
  },
  required: ["days"],
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, {
      error:
        "Server misconfiguration: OPENAI_API_KEY is not set. Add it in the Netlify site environment variables.",
    });
  }

  // --- validate request body ---
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return json(400, { error: "Invalid JSON in request body." });
  }

  const { selectedGenres, timetable } = body;

  if (
    !Array.isArray(selectedGenres) ||
    selectedGenres.length === 0 ||
    !selectedGenres.every((g) => typeof g === "string" && g.trim())
  ) {
    return json(400, { error: "`selectedGenres` must be a non-empty array of strings." });
  }
  if (!timetable || !Array.isArray(timetable.days) || timetable.days.length === 0) {
    return json(400, { error: "`timetable` must be an object with a non-empty `days` array." });
  }

  // Compact the timetable to just what the model needs.
  const compactDays = timetable.days.map((d) => ({
    day: d.day || null,
    date: d.date || null,
    performances: (d.performances || []).map((p) => ({
      band: p.band,
      stage: p.stage,
      start: p.start,
      end: p.end,
      genres: Array.isArray(p.genres) ? p.genres : null,
    })),
  }));

  const instructions = [
    "You are a festival scheduling assistant.",
    "Build a personal timetable for a fan based on their selected music genres.",
    "Rules:",
    "- Only use performances that exist in the provided timetable; never invent bands, stages, or times.",
    "- Copy startTime, endTime, stage and band exactly from the source timetable (times in HH:MM).",
    "- Prefer bands whose music likely matches the selected genres.",
    "- Each performance may include a `genres` array; treat it as the primary signal for matching against the selected genres.",
    "- If a band's `genres` is null or empty, infer carefully and conservatively from the band name; when in doubt, leave it out.",
    "- Avoid overlapping performances within the same day whenever possible.",
    "- Keep one entry per chosen act; produce a focused selection, not the whole lineup.",
    "- Group results by festival day. For each day set: id = lowercase English weekday (e.g. \"friday\"), label = English weekday (e.g. \"Friday\"), date = the day's date (YYYY-MM-DD).",
    "- A day with no matching acts may have an empty performances array.",
    "Return ONLY JSON matching the provided schema. No prose.",
  ].join("\n");

  const input = JSON.stringify({ selectedGenres, timetable: { days: compactDays } });

  // --- call OpenAI Responses API ---
  let aiRes;
  try {
    aiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input,
        temperature: 0.4,
        max_output_tokens: 4000,
        text: {
          format: {
            type: "json_schema",
            name: "personal_timetable",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });
  } catch (err) {
    return json(502, { error: "Failed to reach the AI service.", detail: String(err.message || err) });
  }

  const raw = await aiRes.json().catch(() => null);
  if (!aiRes.ok) {
    const detail = (raw && raw.error && raw.error.message) || `HTTP ${aiRes.status}`;
    return json(502, { error: "AI request failed.", detail });
  }

  const text = extractOutputText(raw);
  if (!text) {
    return json(502, { error: "AI returned an empty response." });
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (_) {
    return json(502, { error: "AI returned invalid JSON." });
  }

  if (!isValidTimetable(result)) {
    return json(502, { error: "AI response did not match the expected timetable shape." });
  }

  return json(200, result);
};

// Pull the text output out of a Responses API result.
function extractOutputText(raw) {
  if (!raw) return "";
  if (typeof raw.output_text === "string" && raw.output_text) return raw.output_text;
  const parts = [];
  for (const item of raw.output || []) {
    for (const c of item.content || []) {
      if (c.type === "output_text" && typeof c.text === "string") parts.push(c.text);
    }
  }
  return parts.join("");
}

function isValidTimetable(obj) {
  if (!obj || !Array.isArray(obj.days)) return false;
  return obj.days.every(
    (d) =>
      d &&
      typeof d.id === "string" &&
      typeof d.label === "string" &&
      typeof d.date === "string" &&
      Array.isArray(d.performances) &&
      d.performances.every(
        (p) =>
          p &&
          typeof p.startTime === "string" &&
          typeof p.endTime === "string" &&
          typeof p.stage === "string" &&
          typeof p.band === "string"
      )
  );
}
