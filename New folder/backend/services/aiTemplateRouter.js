const Groq = require("groq-sdk");
const { normalizeUiPreset, inferUiPresetFromPrompt } = require("./uiPresets");

const DEPRECATED_GROQ_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
]);

const configuredModel = String(process.env.GROQ_MODEL || "").trim();
const MODEL_CHAIN = [
  configuredModel && !DEPRECATED_GROQ_MODELS.has(configuredModel)
    ? configuredModel
    : null,
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
].filter(Boolean);

let groqClient = null;
function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function cleanJsonString(raw = "") {
  return String(raw || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeHexColor(val, fallback) {
  if (!val) return fallback;
  const s = String(val).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toUpperCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1] + s[1];
    const g = s[2] + s[2];
    const b = s[3] + s[3];
    return `#${r}${g}${b}`.toUpperCase();
  }
  return fallback;
}

function isLightColor(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

function sanitizeThemePalette(raw) {
  if (!raw || typeof raw !== "object") return null;
  const background = normalizeHexColor(raw.background, "#020617");
  const isLight = typeof raw.isLight === "boolean" ? raw.isLight : isLightColor(background);
  return {
    name: String(raw.name || "Custom").trim(),
    primary: normalizeHexColor(raw.primary, isLight ? "#2563EB" : "#22D3EE"),
    secondary: normalizeHexColor(raw.secondary, isLight ? "#38BDF8" : "#38BDF8"),
    background,
    surface: normalizeHexColor(raw.surface, isLight ? "#FFFFFF" : "#0F172A"),
    text: normalizeHexColor(raw.text, isLight ? "#1C1917" : "#FFFFFF"),
    accent: normalizeHexColor(raw.accent, isLight ? "#0284C7" : "#10B981"),
    isLight,
  };
}

function deterministicThemeFallback(instruction = '') {
  const clean = String(instruction || '').toLowerCase();
  if (/dark|black|midnight|night|cyber|neon/.test(clean)) {
    return sanitizeThemePalette({ name:'Safe Dark', primary:'#22D3EE', secondary:'#8B5CF6', background:'#020617', surface:'#0F172A', text:'#F8FAFC', accent:'#10B981', isLight:false });
  }
  if (/beige|cream|warm|sand/.test(clean)) {
    return sanitizeThemePalette({ name:'Safe Warm', primary:'#A16207', secondary:'#D97706', background:'#FFFBEB', surface:'#FFFFFF', text:'#292524', accent:'#0F766E', isLight:true });
  }
  if (/pink|rose/.test(clean)) {
    return sanitizeThemePalette({ name:'Safe Rose', primary:'#DB2777', secondary:'#F472B6', background:'#FDF2F8', surface:'#FFFFFF', text:'#500724', accent:'#7C3AED', isLight:true });
  }
  if (/green|health|nature/.test(clean)) {
    return sanitizeThemePalette({ name:'Safe Green', primary:'#16A34A', secondary:'#22C55E', background:'#F0FDF4', surface:'#FFFFFF', text:'#14532D', accent:'#F97316', isLight:true });
  }
  return sanitizeThemePalette({ name:'Safe Blue', primary:'#2563EB', secondary:'#38BDF8', background:'#F8FAFC', surface:'#FFFFFF', text:'#0F172A', accent:'#10B981', isLight:true });
}

/**
 * Fast extractor to convert ANY theme or color instruction (e.g. "change theme to beige color",
 * "sunset peach pastel", "dark cyberpunk neon") directly into a cohesive 6-color hex palette.
 */
async function extractThemePalette(instruction = "") {
  const client = getGroqClient();
  if (!client) return null;
  const clean = String(instruction || "").trim();
  if (!clean) return null;

  for (const model of MODEL_CHAIN) {
    try {
      const response = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: "system",
              content: `You are an expert Flutter UI color designer.
Given a user prompt about theme or color, return a cohesive, beautiful, high-contrast Flutter color palette as a JSON object:
{
  "name": "descriptive name",
  "primary": "#RRGGBB",
  "secondary": "#RRGGBB",
  "background": "#RRGGBB",
  "surface": "#RRGGBB",
  "text": "#RRGGBB",
  "accent": "#RRGGBB",
  "isLight": true or false
}
Rules:
- All hex codes must be 6 hex characters prefixed with '#' (e.g. "#F5F5DC").
- Ensure high contrast: If background is light (isLight: true), text MUST be dark (e.g. "#1C1917" or "#292524") and surface should be clean card color (e.g. "#FFFFFF").
- If background is dark (isLight: false), text MUST be light (e.g. "#FFFFFF").
- Return raw JSON only.`
            },
            { role: "user", content: `Prompt: ${clean}` }
          ],
          temperature: 0.1,
          max_tokens: 700,
          response_format: { type: "json_object" },
        },
        { timeout: 4000 }
      );

      const raw = cleanJsonString(response?.choices?.[0]?.message?.content || "");
      const parsed = JSON.parse(raw);
      const sanitized = sanitizeThemePalette(parsed);
      if (sanitized) return sanitized;
    } catch (err) {
      console.warn(`extractThemePalette model ${model} failed, trying next:`, err.message);
    }
  }
  console.warn('extractThemePalette: all AI palette models failed; using deterministic safe palette.');
  return deterministicThemeFallback(clean);
}

function toCamelCase(label = "") {
  const words = String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "customField";
  return words
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}

function titleCase(label = "") {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const VALID_TYPES = new Set(["text", "number", "date", "email", "phone", "textarea", "select"]);

function sanitizeExtractedField(rawField, index) {
  if (!rawField || typeof rawField !== "object") return null;

  const rawLabel = String(rawField.label || rawField.name || "").trim();
  // Filter out stop words, single-character garbage like "a", articles, or "field"
  const cleanLabel = rawLabel.replace(/\b(a|an|the|new|extra|field|fields)\b/gi, "").trim();
  if (!cleanLabel || cleanLabel.length < 2) return null;

  const label = titleCase(cleanLabel);
  const name = toCamelCase(cleanLabel);

  let type = String(rawField.type || "text").toLowerCase().trim();
  if (!VALID_TYPES.has(type)) {
    if (/\b(number|price|amount|age|quantity|count|roll|score|rating|sets|reps|weight)\b/i.test(label)) {
      type = "number";
    } else if (/\b(date|day|time|deadline)\b/i.test(label)) {
      type = "date";
    } else if (/\b(email)\b/i.test(label)) {
      type = "email";
    } else if (/\b(phone|mobile|contact)\b/i.test(label)) {
      type = "phone";
    } else if (/\b(description|details|notes|content|bio|address)\b/i.test(label)) {
      type = "textarea";
    } else {
      type = "text";
    }
  }

  const required = index === 0 ? true : Boolean(rawField.required);
  const options = Array.isArray(rawField.options) ? rawField.options.map((o) => String(o).trim()).filter(Boolean) : undefined;

  return {
    name,
    label,
    type,
    required,
    ...(options && options.length ? { options } : {}),
  };
}

/**
 * Analyze user app prompt using Groq.
 * Returns structured intent with full hex theme palette:
 * {
 *   isCrud: boolean,
 *   archetype: string,
 *   appName: string,
 *   entity: string,
 *   theme: { name, primary, secondary, background, surface, text, accent, isLight } | null,
 *   layout: string | null,
 *   hasExplicitFields: boolean,
 *   fields: AppField[]
 * }
 * Or null if AI is unavailable / fails (enabling 100% safe fallback).
 */
async function analyzeAppPrompt(prompt = "") {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) return null;

  const client = getGroqClient();
  if (!client) {
    return null;
  }

  const systemPrompt = `You are a Flutter application architect and intent parser for VibeApp.
You classify a user's app request and extract structured parameters.

The app builder has two execution routes:
1. "template": For CRUD / record-management apps (e.g., student management, expense tracker, task manager, product inventory, appointments, clinic, fitness log, notes, recipe book, habit tracker, CRM, staff, etc.).
2. "custom_ai": For non-CRUD, novel, calculation, or utility apps (e.g., scientific calculator, stopwatch, unit converter, tic-tac-toe, quiz game, drawing canvas, soundboard, flashlight, etc.).

Return ONLY a valid JSON object matching this schema:
{
  "isCrud": true,
  "archetype": "student",
  "appName": "StudentHub",
  "entity": "Student",
  "theme": {
    "name": "Emerald",
    "primary": "#10B981",
    "secondary": "#34D399",
    "background": "#022C22",
    "surface": "#064E3B",
    "text": "#FFFFFF",
    "accent": "#6EE7B7",
    "isLight": false
  },
  "layout": "grid",
  "uiPreset": "business",
  "auth": {
    "enabled": true,
    "allowSignup": true,
    "roles": ["User", "Admin"]
  },
  "hasExplicitFields": true,
  "fields": [
    {
      "name": "fullName",
      "label": "Full Name",
      "type": "text",
      "required": true
    },
    {
      "name": "rollNumber",
      "label": "Roll Number",
      "type": "number",
      "required": true
    }
  ]
}

Rules:
- "isCrud": Set true if the user wants to manage, list, add, edit, or track records/items. Set false only if it is a standalone tool, game, or calculation utility with no database/list.
- "auth.enabled": Set true when login, sign-in, authentication, roles, or permissions are requested. Extract the requested role names. When roles are requested but unnamed, infer domain-appropriate roles from the app context. Only use generic User/Admin if the domain truly gives no stronger signal.
- "auth.allowSignup": Set true when signup/register/create-account is requested. For role-based apps, default to true unless the user explicitly requests login only.
- "uiPreset": Choose exactly one of "minimal", "modern", "business", "soft", or "compact".
- "theme": If a theme, mood, or color is mentioned or implied, generate a cohesive 6-color hex palette (#RRGGBB) with appropriate isLight boolean. If background is light (e.g. beige, cream, white), isLight MUST be true, text MUST be dark (#1C1917), and surface should be clean card (#FFFFFF).
- If the user specifies what fields should be there (e.g. "with fields name, roll and grade" or "only name, age", "fields should be X, Y"), "hasExplicitFields" MUST be true and "fields" MUST contain ONLY those fields.
- If the user does NOT list fields, "hasExplicitFields" MUST be false and you MUST infer 5-8 useful, domain-specific fields for the primary entity. Never fall back to generic Title, Description, Status when the domain implies better fields.
- Choose useful field types and select options. For example, a short "trip management app" request should infer fields such as Trip Name, Destination, Start Date, End Date, Budget, Travelers, and Trip Status—not Title and Description.
- The first field must be a human-readable identity field such as Trip Name, Guest Name, Product Name, or Appointment Title and must be required.
- Do NOT output markdown or backticks. Return raw JSON only.`;

  for (const model of MODEL_CHAIN) {
    try {
      const response = await client.chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `App request: "${cleanPrompt}"` },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        },
        { timeout: 4500 }
      );

      const raw = cleanJsonString(response?.choices?.[0]?.message?.content || "");
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      return {
        isCrud: Boolean(parsed.isCrud !== false),
        archetype: String(parsed.archetype || "generic").toLowerCase().trim(),
        appName: String(parsed.appName || "").trim(),
        entity: String(parsed.entity || "").trim(),
        theme: parsed.theme && typeof parsed.theme === "object" ? sanitizeThemePalette(parsed.theme) : null,
        layout: typeof parsed.layout === "string" ? parsed.layout.trim() : null,
        uiPreset: normalizeUiPreset(parsed.uiPreset || inferUiPresetFromPrompt(cleanPrompt)),
        hasExplicitFields: Boolean(parsed.hasExplicitFields),
        fields: Array.isArray(parsed.fields) ? parsed.fields.map(sanitizeExtractedField).filter(Boolean) : [],
        auth: {
          enabled: Boolean(parsed.auth?.enabled),
          allowSignup: parsed.auth?.allowSignup !== false && Boolean(parsed.auth?.enabled),
          roles: Array.isArray(parsed.auth?.roles)
            ? parsed.auth.roles.map((role) => String(role || "").trim()).filter(Boolean).slice(0, 6)
            : [],
        },
      };
    } catch (err) {
      console.warn(`Groq prompt analysis with ${model} failed:`, err.message);
    }
  }

  return null;
}

/**
 * Parse an edit instruction to see if it maps to a fast structured action:
 * - ADD_FIELDS
 * - REMOVE_FIELD
 * - TOGGLE_FEATURE
 * - THEME_CHANGE
 * - LAYOUT_CHANGE
 * - APP_NAME
 * - NONE / CUSTOM
 */
async function parseEditIntent(instruction = "", currentConfig = null) {
  const clean = String(instruction || "").trim().toLowerCase();
  if (!clean) return { action: "NONE" };

  const isRemove = /\b(remove|hide|disable|without|no)\b/i.test(clean);

  const designMatch = clean.match(/(?:change|switch|set|use|apply)?\s*(?:ui\s+)?(?:design\s+)?(?:template|preset|style)\s+(?:to\s+)?(minimal|clean|modern|business|professional|corporate|soft|rounded|compact|dense)/i);
  if (designMatch) {
    const uiPreset = normalizeUiPreset(designMatch[1]);
    return { action: "UI_PRESET_CHANGE", uiPreset, message: `UI template changed to ${uiPreset}` };
  }

  if (/\b(login|log in|sign in|signin|authentication|auth|role[- ]based|permissions?|user roles?)\b/i.test(clean)) {
    const knownRoles = ["Administrator", "Admin", "Owner", "Manager", "Staff", "Employee", "Editor", "Viewer", "Customer", "Doctor", "Receptionist", "Teacher", "Student", "Patient"];
    let roles = knownRoles.filter((role) => new RegExp(`\\b${role.toLowerCase()}\\b`, "i").test(clean));
    const explicitRoles = instruction.match(/\broles\s*(?::|=|are|as)\s*([^;]+)/i);
    if (explicitRoles) {
      const parsedRoles = explicitRoles[1]
        .split(/,|\band\b|\//i)
        .map((role) => role.replace(/\b(with|signup|sign up|login|dashboard|dashboards|permissions?)\b.*$/i, "").trim())
        .filter((role) => role.length >= 2 && role.length <= 40);
      if (parsedRoles.length) roles = parsedRoles;
    }
    const signupRequested = /\b(sign ?up|signup|register|create account)\b/i.test(clean);
    const loginOnly = /\blogin only\b/i.test(clean);
    return {
      action: "AUTH_CHANGE",
      enabled: !isRemove,
      roles: roles.length ? roles.slice(0, 10) : (Array.isArray(currentConfig?.features?.roles) && currentConfig.features.roles.length ? currentConfig.features.roles.slice(0, 10) : ["User", "Admin"]),
      allowSignup: !isRemove && (signupRequested || !loginOnly),
      message: isRemove ? "Removed authentication" : "Added role-based authentication",
    };
  }

  const experienceFeatures = [
    { pattern: /\bsplash(?:\s+screen)?\b/i, feature: "hasSplash", label: "splash screen" },
    { pattern: /\bdashboard(?:\s+screen|\s+page)?\b/i, feature: "hasDashboard", label: "dashboard" },
    { pattern: /\b(?:user\s+)?profile(?:\s+screen|\s+page)?\b/i, feature: "hasProfile", label: "profile" },
    { pattern: /\bsettings?(?:\s+screen|\s+page)?\b/i, feature: "hasSettings", label: "settings" },
  ];
  const experienceMatch = experienceFeatures.find((item) => item.pattern.test(clean));
  if (experienceMatch) {
    return {
      action: "TOGGLE_FEATURE",
      feature: experienceMatch.feature,
      value: !isRemove,
      message: `${isRemove ? "Removed" : "Added"} ${experienceMatch.label}`,
    };
  }

  if (/\b(drawer|side\s+menu|sidebar|bottom\s+(?:nav|navigation|bar)|tab\s+bar|navigation)\b/i.test(clean)) {
    let navigation = "bottom";
    if (isRemove) navigation = "none";
    else if (/\b(drawer|side\s+menu|sidebar)\b/i.test(clean)) navigation = "drawer";
    return {
      action: "NAVIGATION_CHANGE",
      navigation,
      message: navigation === "none" ? "Removed app navigation" : `Changed navigation to ${navigation}`,
    };
  }

  // 1. Fast heuristics for stats banner
  if (/\b(stats|statistics|summary|metrics|stats banner|stats summary)\b/i.test(clean)) {
    const isRemove = /\b(remove|hide|disable|without|no)\b/i.test(clean);
    return {
      action: "TOGGLE_FEATURE",
      feature: "hasStatsSummary",
      value: !isRemove,
      message: isRemove ? "Removed stats summary banner" : "Added stats summary banner",
    };
  }

  // 2. Fast heuristics for filter chips
  if (/\b(filter chip|filter chips|filter tabs|filter by|category filter|status filter|add filter|enable filter)\b/i.test(clean)) {
    const isRemove = /\b(remove|hide|disable|without|no)\b/i.test(clean);
    return {
      action: "TOGGLE_FEATURE",
      feature: "hasFilterChips",
      value: !isRemove,
      message: isRemove ? "Removed filter chips" : "Added filter chips bar",
    };
  }

  // 3. Fast heuristics for delete confirmation
  if (/\b(confirm delete|confirmation dialog|ask before delete|warn before delete|delete confirm)\b/i.test(clean)) {
    const isRemove = /\b(remove|disable|without|no)\b/i.test(clean);
    return {
      action: "TOGGLE_FEATURE",
      feature: "hasDeleteConfirm",
      value: !isRemove,
      message: isRemove ? "Disabled delete confirmation dialog" : "Enabled delete confirmation dialog",
    };
  }

  // 4. Fast heuristics for layout
  if (/\b(grid|catalog|gallery)\b/i.test(clean) && /\b(layout|view|display|show)\b/i.test(clean)) {
    return { action: "LAYOUT_CHANGE", layout: "catalog_grid", message: "Layout changed to grid view" };
  }
  if (/\b(table|ledger|spreadsheet)\b/i.test(clean) && /\b(layout|view|display|show)\b/i.test(clean)) {
    return { action: "LAYOUT_CHANGE", layout: "ledger_table", message: "Layout changed to table view" };
  }
  if (/\b(timeline|agenda|rail)\b/i.test(clean) && /\b(layout|view|display|show)\b/i.test(clean)) {
    return { action: "LAYOUT_CHANGE", layout: "timeline_rail", message: "Layout changed to timeline view" };
  }
  if (/\b(kanban|board|pipeline)\b/i.test(clean) && /\b(layout|view|display|show)\b/i.test(clean)) {
    return { action: "LAYOUT_CHANGE", layout: "kanban_board", message: "Layout changed to kanban board" };
  }
  if (/\b(list|cards|stack)\b/i.test(clean) && /\b(layout|view|display|show)\b/i.test(clean)) {
    return { action: "LAYOUT_CHANGE", layout: "card_stack", message: "Layout changed to list view" };
  }

  // 5. Fast heuristics for theme/color
  if (/\b(theme|color|colour|mode|background|palette)\b/i.test(clean)) {
    const palette = await extractThemePalette(instruction);
    if (palette) {
      return {
        action: "THEME_CHANGE",
        theme: palette,
        message: `Theme changed to ${palette.name || "custom color"}`,
      };
    }
  }

  // 6. Fast heuristics for removing field
  const removeMatch = clean.match(/(?:remove|delete|drop|hide)\s+(?:the\s+)?([a-z0-9\s_]+?)\s+field/i);
  if (removeMatch) {
    const fieldName = toCamelCase(removeMatch[1]);
    return {
      action: "REMOVE_FIELD",
      fieldName,
      message: `Field ${removeMatch[1].trim()} removed`,
    };
  }

  // 7. Fast heuristics for adding field(s)
  let rawFieldsStr = null;
  const matchAfterField = clean.match(/(?:add|include|create|insert)\s+(?:a|an|the|new|one|extra)?\s*fields?\s+(?:called|named|for)?\s*([a-z0-9\s,+/]+)/i);
  const matchBeforeField = clean.match(/(?:add|include|create|insert)\s+([a-z0-9\s,+/]+?)\s+fields?/i);

  if (matchAfterField) {
    rawFieldsStr = matchAfterField[1];
  } else if (matchBeforeField) {
    rawFieldsStr = matchBeforeField[1].replace(/\b(a|an|the|new|extra|custom)\b/gi, "").trim();
  } else {
    const simpleAddMatch = clean.match(/^(?:add|include|create)\s+(?:a|an|the|new)?\s*([a-z0-9\s]+)$/i);
    if (simpleAddMatch) {
      const candidate = simpleAddMatch[1].trim();
      const isOther = /\b(theme|mode|color|colour|grid|table|timeline|kanban|list|search|stats|filter|chip|login|signup|auth|profile|settings|page|screen)\b/i.test(candidate);
      if (!isOther && candidate.length >= 2) {
        rawFieldsStr = candidate;
      }
    }
  }

  if (rawFieldsStr) {
    const optionsMatch = clean.match(/with options\s+([a-z0-9\s,+/]+)/i);
    const options = optionsMatch
      ? optionsMatch[1].split(/[,+/]|\band\b/).map((s) => s.trim()).filter(Boolean)
      : undefined;

    const parts = rawFieldsStr
      .replace(/with options.*$/i, "")
      .replace(/\b(and|or)\b/g, ",")
      .split(/[,+/]/)
      .map((p) => p.replace(/\b(a|an|the|new|extra|field|fields)\b/gi, "").trim())
      .filter((p) => p && p.length > 1);

    const newFields = parts
      .map((part, idx) => {
        const fieldObj = sanitizeExtractedField({ name: part, label: part, options }, idx);
        if (options && options.length && fieldObj) fieldObj.type = "select";
        return fieldObj;
      })
      .filter(Boolean);

    if (newFields.length > 0) {
      return {
        action: "ADD_FIELDS",
        fields: newFields,
        message: `Added ${newFields.map((f) => f.label).join(", ")} field(s)`,
      };
    }
  }

  // 8. If nothing matched fast heuristics, query Groq for classification
  const client = getGroqClient();
  if (client) {
    for (const model of MODEL_CHAIN) {
      try {
        const response = await client.chat.completions.create(
          {
            model,
            messages: [
              {
                role: "system",
               content: `You are an intent parser for modifying a Flutter CRUD app.
Current app state:
${currentConfig ? JSON.stringify({ entity: currentConfig.entity, fields: currentConfig.fields?.map(f => f.name), features: currentConfig.features }) : "CRUD App"}

Classify the user's edit instruction into ONE action JSON:
 - TOGGLE_FEATURE: {"action": "TOGGLE_FEATURE", "feature": "hasStatsSummary" | "hasFilterChips" | "hasDeleteConfirm" | "hasSplash" | "hasDashboard" | "hasProfile" | "hasSettings", "value": true/false}
 - NAVIGATION_CHANGE: {"action": "NAVIGATION_CHANGE", "navigation": "bottom" | "drawer" | "none"}
- UI_PRESET_CHANGE: {"action": "UI_PRESET_CHANGE", "uiPreset": "minimal"|"modern"|"business"|"soft"|"compact"}
- AUTH_CHANGE: {"action": "AUTH_CHANGE", "enabled": true|false, "allowSignup": true|false, "roles": ["Admin", "Manager"]}
- ADD_FIELDS: {"action": "ADD_FIELDS", "fields": [{"name": "string", "label": "string", "type": "text"|"number"|"date"|"select", "options": []}]}
- REMOVE_FIELD: {"action": "REMOVE_FIELD", "fieldName": "string"}
- THEME_CHANGE: {"action": "THEME_CHANGE", "theme": {"name": "...", "primary": "#HEX", "background": "#HEX", "isLight": boolean}}
- LAYOUT_CHANGE: {"action": "LAYOUT_CHANGE", "layout": "catalog_grid"|"card_stack"|"ledger_table"|"timeline_rail"|"kanban_board"}
- APP_NAME: {"action": "APP_NAME", "appName": "..."}
- CUSTOM: {"action": "CUSTOM"} (use if request requires custom logic not covered above)

Return raw JSON only.`,
              },
              { role: "user", content: `Instruction: ${instruction}` },
            ],
            temperature: 0.1,
            max_tokens: 400,
            response_format: { type: "json_object" },
          },
          { timeout: 3500 }
        );

        const raw = cleanJsonString(response?.choices?.[0]?.message?.content || "");
        const parsed = JSON.parse(raw);
        if (parsed?.action) return parsed;
      } catch (err) {
        console.warn(`parseEditIntent model ${model} failed:`, err.message);
      }
    }
  }

  return { action: "CUSTOM" };
}

module.exports = {
  analyzeAppPrompt,
  extractThemePalette,
  deterministicThemeFallback,
  parseEditIntent,
  sanitizeExtractedField,
  sanitizeThemePalette,
  isLightColor,
};
