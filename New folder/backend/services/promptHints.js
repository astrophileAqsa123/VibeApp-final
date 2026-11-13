// Reads the small, explicit instructions people put in a prompt and turns them
// into structured hints the generators can honour:
//
//   "blue student management app"                       -> blue theme
//   "black and gold notepad"                            -> dark theme, gold accent
//   "... with name, age, phone and course fields"       -> exact field list
//   "call it Bright Minds" / "named Bright Minds"       -> app name
//
// Everything here is deterministic and cheap, so it also works when the AI
// planner is unavailable.

const COLOR_FAMILIES = {
  blue: { primary: "#2563EB", secondary: "#38BDF8", accent: "#0EA5E9", tint: "#EFF6FF", ink: "#172554" },
  navy: { primary: "#1E3A8A", secondary: "#3B82F6", accent: "#60A5FA", tint: "#EFF6FF", ink: "#172554" },
  sky: { primary: "#0284C7", secondary: "#38BDF8", accent: "#7DD3FC", tint: "#F0F9FF", ink: "#0C4A6E" },
  cyan: { primary: "#0891B2", secondary: "#22D3EE", accent: "#67E8F9", tint: "#ECFEFF", ink: "#164E63" },
  teal: { primary: "#0D9488", secondary: "#2DD4BF", accent: "#5EEAD4", tint: "#F0FDFA", ink: "#134E4A" },
  green: { primary: "#16A34A", secondary: "#22C55E", accent: "#86EFAC", tint: "#F0FDF4", ink: "#14532D" },
  emerald: { primary: "#059669", secondary: "#10B981", accent: "#34D399", tint: "#ECFDF5", ink: "#064E3B" },
  lime: { primary: "#65A30D", secondary: "#84CC16", accent: "#BEF264", tint: "#F7FEE7", ink: "#365314" },
  yellow: { primary: "#CA8A04", secondary: "#EAB308", accent: "#FDE047", tint: "#FEFCE8", ink: "#422006" },
  gold: { primary: "#D4AF37", secondary: "#F5D76E", accent: "#B8860B", tint: "#FFFBEB", ink: "#422006", lightPrimary: "#B8860B" },
  orange: { primary: "#EA580C", secondary: "#FB923C", accent: "#FDBA74", tint: "#FFF7ED", ink: "#431407" },
  red: { primary: "#DC2626", secondary: "#F87171", accent: "#FCA5A5", tint: "#FEF2F2", ink: "#450A0A" },
  maroon: { primary: "#9F1239", secondary: "#E11D48", accent: "#FDA4AF", tint: "#FFF1F2", ink: "#4C0519" },
  pink: { primary: "#DB2777", secondary: "#F472B6", accent: "#F9A8D4", tint: "#FDF2F8", ink: "#500724" },
  purple: { primary: "#7C3AED", secondary: "#A78BFA", accent: "#C4B5FD", tint: "#F5F3FF", ink: "#2E1065" },
  indigo: { primary: "#4F46E5", secondary: "#818CF8", accent: "#A5B4FC", tint: "#EEF2FF", ink: "#1E1B4B" },
  brown: { primary: "#92400E", secondary: "#B45309", accent: "#D6A77A", tint: "#FAF5EB", ink: "#292524" },
  beige: { primary: "#A67C52", secondary: "#C19A6B", accent: "#D2B48C", tint: "#F5F5DC", ink: "#292524" },
  gray: { primary: "#475569", secondary: "#64748B", accent: "#94A3B8", tint: "#F8FAFC", ink: "#0F172A" },
};

// Words people actually write -> palette key.
const COLOR_ALIASES = [
  [/\bnavy\b/, "navy"], [/\b(?:sky|light blue)\b/, "sky"], [/\b(?:blue)\b/, "blue"],
  [/\b(?:cyan|aqua|turquoise)\b/, "cyan"], [/\bteal\b/, "teal"], [/\bemerald\b/, "emerald"],
  [/\b(?:lime)\b/, "lime"], [/\b(?:green|mint)\b/, "green"],
  [/\b(?:gold|golden)\b/, "gold"], [/\b(?:yellow|amber|mustard)\b/, "yellow"],
  [/\b(?:orange|sunset|tangerine)\b/, "orange"], [/\b(?:maroon|burgundy|crimson)\b/, "maroon"], [/\bred\b/, "red"],
  [/\b(?:pink|rose|magenta)\b/, "pink"], [/\b(?:purple|violet|lavender)\b/, "purple"], [/\bindigo\b/, "indigo"],
  [/\b(?:brown|chocolate|coffee)\b/, "brown"], [/\b(?:beige|cream|sand)\b/, "beige"],
  [/\b(?:gr[ae]y|slate|silver|monochrome)\b/, "gray"],
];

function findColors(text) {
  const found = [];
  for (const [re, key] of COLOR_ALIASES) {
    const match = re.exec(text);
    if (match) found.push({ key, index: match.index });
  }
  return found.sort((a, b) => a.index - b.index).map((item) => item.key).filter((key, i, all) => all.indexOf(key) === i);
}

function darkThemeFor(family, { pureBlack = false } = {}) {
  return {
    mode: "dark",
    primary: family.primary,
    secondary: family.secondary,
    accent: family.accent,
    background: pureBlack ? "#0A0A0A" : "#0B1120",
    surface: pureBlack ? "#171717" : "#111827",
    text: "#F8FAFC",
    isLight: false,
  };
}

function lightThemeFor(family) {
  return {
    mode: "light",
    primary: family.lightPrimary || family.primary,
    secondary: family.secondary,
    accent: family.accent,
    background: family.tint,
    surface: "#FFFFFF",
    text: family.ink,
    isLight: true,
  };
}

/**
 * Theme requested in the prompt, or null when the prompt names no colour.
 * A plain "dark"/"black" request (no colour) returns null on purpose so the
 * caller's existing dark palette is kept.
 */
function themeFromPrompt(prompt = "") {
  const text = String(prompt || "").toLowerCase();
  const hex = text.match(/#([0-9a-f]{6})\b/);
  const wantsDark = /\b(dark|black|midnight|night)\b/.test(text);
  const wantsBlack = /\bblack\b/.test(text);
  const wantsLight = /\b(light theme|light mode|white)\b/.test(text);
  let families = findColors(text).map((key) => COLOR_FAMILIES[key]);

  if (hex) {
    const primary = `#${hex[1].toUpperCase()}`;
    families = [{ primary, secondary: primary, accent: primary, tint: "#F8FAFC", ink: "#0F172A" }, ...families];
  }
  if (!families.length) return null;

  const [primary, secondary] = families;
  const family = secondary ? { ...primary, secondary: secondary.primary, accent: secondary.accent } : primary;
  const theme = wantsDark && !wantsLight ? darkThemeFor(family, { pureBlack: wantsBlack }) : lightThemeFor(family);
  const names = hex ? ["custom"] : findColors(text);
  return { ...theme, label: `${wantsDark && !wantsLight ? "dark " : ""}${names.slice(0, 2).join(" and ")}`.trim() };
}

// ------------------------------------------------------------------ fields --

const LIST_STOP = new Set(["the", "a", "an", "its", "their", "some", "all", "any", "more", "other", "also", "basic", "simple", "following"]);
const NOT_FIELDS = /^(login|log in|sign in|signin|signup|sign up|auth|authentication|roles?|permissions?|dashboard|screens?|pages?|theme|colou?rs?|search|filter|charts?|graphs?|reports?|navigation|layout|animations?|dark mode|splash|logo)$/i;

function toFieldDefinition(rawLabel) {
  const label = String(rawLabel)
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !LIST_STOP.has(word.toLowerCase()))
    .join(" ")
    .trim();
  if (!label || label.split(" ").length > 3 || NOT_FIELDS.test(label)) return null;
  const titled = label.replace(/\b\w/g, (c) => c.toUpperCase());
  const id = titled.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toLowerCase());
  const lower = label.toLowerCase();
  let type = "text";
  let options;
  if (/\b(age|quantity|qty|stock|price|amount|cost|salary|score|marks?|count|total|fee|fees|balance|capacity|rating|weight|height|duration|year)\b/.test(lower)) type = "number";
  else if (/\b(date|dob|birthday|birth|deadline|due|joined)\b/.test(lower)) type = "date";
  else if (/\be-?mail\b/.test(lower)) type = "email";
  else if (/\b(phone|mobile|cell|whatsapp|contact number|tel|telephone)\b/.test(lower)) type = "phone";
  else if (/\b(description|notes?|address|details?|remarks?|comments?|bio|content|message)\b/.test(lower)) type = "textarea";
  else if (/^status$/.test(lower)) { type = "status"; options = ["Active", "Pending", "Completed"]; }
  else if (/^(gender|sex)$/.test(lower)) { type = "select"; options = ["Female", "Male", "Other"]; }
  else if (/^priority$/.test(lower)) { type = "select"; options = ["High", "Medium", "Low"]; }
  return { id, label: titled, type, ...(options ? { options } : {}) };
}

/**
 * Field list the user asked for, e.g. "with name, age, phone and course fields".
 * Returns [] unless the prompt clearly lists at least two fields.
 */
function extractExplicitFields(prompt = "") {
  const text = String(prompt || "");
  const patterns = [
    /\b(?:with|having|include|including|containing|contains|has)\s+(?:the\s+)?(?:these\s+)?(?:fields?|columns?|attributes?)\s*(?:of|like|such as)?\s*[:\-]?\s*([^.;\n]{3,160})/i,
    /\b(?:with|having|include|including|containing|contains|has)\s+((?:[a-z][a-z0-9 ]{1,24}?\s*(?:,|\band\b|&|\/)\s*){1,9}[a-z][a-z0-9 ]{1,24}?)\s*(?:fields?|columns?|attributes?)\b/i,
    /\b(?:fields?|columns?)\s*(?:are|=|:)\s*([^.;\n]{3,160})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    let raw = match[1].replace(/\b(?:fields?|columns?|attributes?)\b.*$/i, " ");
    raw = raw.split(/\b(?:and\s+(?:a|an|the)\s+\w+\s+(?:theme|color|colour|screen|layout)|in\s+(?:a\s+)?(?:\w+\s+)?(?:theme|color|colour|layout|grid|list|table)|using|where|so that)\b/i)[0];
    const seen = new Set();
    const fields = raw
      .split(/,|\/|&|\band\b/i)
      .map(toFieldDefinition)
      .filter((field) => field && !seen.has(field.id) && seen.add(field.id));
    if (fields.length >= 2 && fields.length <= 12) return fields;
  }
  return [];
}

function extractAppName(prompt = "") {
  const match = String(prompt || "").match(/\b(?:called|named|name it|call it|titled)\s+["“']?([A-Za-z0-9][A-Za-z0-9 &'-]{1,32}?)["”']?(?=\s+(?:with|that|which|for|and|using|in)\b|[.,;!?]|$)/i);
  return match ? match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}

/** Pick the entity the prompt is mostly about ("student management" -> student). */
function choosePrimaryEntity(entities = [], prompt = "") {
  const text = String(prompt || "").toLowerCase();
  let best = null;
  for (const entity of entities) {
    const names = [entity.id, entity.name].map((value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    for (const name of names) {
      if (name.length < 3) continue;
      const index = text.replace(/[^a-z0-9 ]/g, "").indexOf(name);
      if (index >= 0 && (!best || index < best.index)) best = { entity, index };
    }
  }
  return best ? best.entity : null;
}

module.exports = { themeFromPrompt, extractExplicitFields, extractAppName, choosePrimaryEntity, toFieldDefinition };
