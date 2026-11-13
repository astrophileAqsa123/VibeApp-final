const UI_PRESETS = Object.freeze({
  modern: {
    id: "modern",
    label: "Modern Cards",
    uiVariant: 20,
    radius: 26,
    density: "comfortable",
  },
  minimal: {
    id: "minimal",
    label: "Clean Minimal",
    uiVariant: 10,
    radius: 14,
    density: "comfortable",
  },
  business: {
    id: "business",
    label: "Business Dashboard",
    uiVariant: 30,
    radius: 18,
    density: "comfortable",
  },
  soft: {
    id: "soft",
    label: "Soft Rounded",
    uiVariant: 40,
    radius: 30,
    density: "spacious",
  },
  compact: {
    id: "compact",
    label: "Compact Data",
    uiVariant: 50,
    radius: 10,
    density: "compact",
  },
});

const ALIASES = Object.freeze({
  clean: "minimal",
  simple: "minimal",
  minimal: "minimal",
  modern: "modern",
  cards: "modern",
  "modern cards": "modern",
  business: "business",
  dashboard: "business",
  professional: "business",
  corporate: "business",
  soft: "soft",
  rounded: "soft",
  friendly: "soft",
  compact: "compact",
  dense: "compact",
  data: "compact",
});

function normalizeUiPreset(value, fallback = "modern") {
  const raw = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!raw) return fallback;
  if (UI_PRESETS[raw]) return raw;
  if (ALIASES[raw]) return ALIASES[raw];
  const hit = Object.entries(ALIASES).find(([alias]) => raw.includes(alias));
  return hit ? hit[1] : fallback;
}

function inferUiPresetFromPrompt(prompt = "", fallback = "modern") {
  const text = String(prompt || "").toLowerCase();
  if (/\b(minimal|minimalist|clean|simple)\b/.test(text)) return "minimal";
  if (/\b(business|professional|corporate|admin dashboard|dashboard style)\b/.test(text)) return "business";
  if (/\b(soft|rounded|friendly|pastel)\b/.test(text)) return "soft";
  if (/\b(compact|dense|data[- ]heavy|admin table)\b/.test(text)) return "compact";
  if (/\b(modern|cards?|sleek|premium)\b/.test(text)) return "modern";
  return fallback;
}

function getUiPreset(value) {
  return UI_PRESETS[normalizeUiPreset(value)];
}

module.exports = { UI_PRESETS, normalizeUiPreset, inferUiPresetFromPrompt, getUiPreset };
