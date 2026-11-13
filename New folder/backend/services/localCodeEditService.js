const exactTemplates = require("./exact500AppTemplates");
const {
  buildFlutterCrudApp,
} = require("./exact500AppTemplates/uniqueFlutterCrudFactory");
const {
  buildFlutterSupabaseCrudApp,
} = require("./exact500AppTemplates/supabaseCrudFactory");
const {
  sanitizeGeneratedFlutterCode,
} = require("./exact500AppTemplates/flutterCodeSafety");
const { extractThemePalette, parseEditIntent } = require("./aiTemplateRouter");

const findBestTemplate = exactTemplates.findBestTemplate;
const templates = exactTemplates.templates || [];

function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(text = "") {
  return normalize(text).replace(/\s+/g, "");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function titleCase(text = "") {
  return normalize(text)
    .replace(/#/g, "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toCamelCase(label = "") {
  const words = normalize(label).replace(/#/g, "").split(" ").filter(Boolean);
  if (!words.length) return "customField";
  return words
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

function includesAny(text, patterns = []) {
  const clean = normalize(text);
  const cleanCompact = compact(text);
  return patterns.some((pattern) => {
    const p = normalize(pattern);
    const pc = compact(pattern);
    return clean.includes(p) || cleanCompact.includes(pc);
  });
}

function hasAny(text, words = []) {
  const clean = normalize(text);
  return words.some((word) => clean.includes(normalize(word)));
}

const colorNameMap = {
  red: "#EF4444",
  blue: "#2563EB",
  cyan: "#00E5FF",
  green: "#10B981",
  emerald: "#10B981",
  purple: "#8B5CF6",
  pink: "#EC4899",
  orange: "#F97316",
  yellow: "#FACC15",
  gold: "#FACC15",
  black: "#020617",
  white: "#FFFFFF",
  gray: "#64748B",
  grey: "#64748B",
  teal: "#14B8A6",
  indigo: "#6366F1",
  violet: "#7C3AED",
};

const themePresets = [
  {
    match: ["black cyan", "black and cyan", "cyan black", "dark cyan", "cyber", "cyan theme"],
    name: "black and cyan",
    theme: { primary: "#00E5FF", secondary: "#22D3EE", background: "#020617", surface: "#0F172A", text: "#FFFFFF", accent: "#38BDF8" },
  },
  {
    match: ["black gold", "black and gold", "gold black", "luxury", "gold theme"],
    name: "black and gold",
    theme: { primary: "#FACC15", secondary: "#F59E0B", background: "#030712", surface: "#111827", text: "#FFFFFF", accent: "#FBBF24" },
  },
  {
    match: ["purple pink", "purple and pink", "pink purple", "neon", "pink theme"],
    name: "purple and pink",
    theme: { primary: "#EC4899", secondary: "#A855F7", background: "#070014", surface: "#17102A", text: "#FFFFFF", accent: "#F472B6" },
  },
  {
    match: ["blue white", "blue and white", "clean blue", "blue theme", "professional blue"],
    name: "blue and white",
    theme: { primary: "#2563EB", secondary: "#38BDF8", background: "#EFF6FF", surface: "#FFFFFF", text: "#0F172A", accent: "#60A5FA" },
  },
  {
    match: ["green", "green theme", "emerald", "mint"],
    name: "green",
    theme: { primary: "#10B981", secondary: "#34D399", background: "#022C22", surface: "#064E3B", text: "#FFFFFF", accent: "#6EE7B7" },
  },
  {
    match: ["orange", "orange theme", "warm", "sunset"],
    name: "orange",
    theme: { primary: "#F97316", secondary: "#FB923C", background: "#1C0700", surface: "#431407", text: "#FFFFFF", accent: "#FDBA74" },
  },
  {
    match: ["white", "white theme", "white mode", "light", "light mode", "light theme", "minimal", "simple white", "clean white", "white clean"],
    name: "white",
    theme: { primary: "#111827", secondary: "#2563EB", background: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", accent: "#2563EB" },
  },
];

const fieldPresets = [
  { keys: ["phone", "phone number", "mobile", "contact number"], field: { name: "phone", label: "Phone Number", type: "phone", required: false } },
  { keys: ["email", "email address"], field: { name: "email", label: "Email Address", type: "email", required: false } },
  { keys: ["address", "location", "home address"], field: { name: "address", label: "Address", type: "text", required: false } },
  { keys: ["city"], field: { name: "city", label: "City", type: "text", required: false } },
  { keys: ["guardian", "guardian name", "parent name", "father name", "mother name"], field: { name: "guardianName", label: "Guardian Name", type: "text", required: false } },
  { keys: ["status"], field: { name: "status", label: "Status", type: "select", required: false, options: ["Active", "Pending", "Completed"] } },
  { keys: ["priority"], field: { name: "priority", label: "Priority", type: "select", required: false, options: ["Low", "Medium", "High"] } },
  { keys: ["due date", "deadline", "due"], field: { name: "dueDate", label: "Due Date", type: "date", required: false } },
  { keys: ["date", "created date", "appointment date"], field: { name: "date", label: "Date", type: "date", required: false } },
  { keys: ["description", "details"], field: { name: "description", label: "Description", type: "textarea", required: false } },
  { keys: ["notes", "note"], field: { name: "notes", label: "Notes", type: "textarea", required: false } },
  { keys: ["price", "amount", "cost"], field: { name: "amount", label: "Amount", type: "number", required: false } },
  { keys: ["quantity", "stock", "qty"], field: { name: "quantity", label: "Quantity", type: "number", required: false } },
  { keys: ["image", "photo", "picture"], field: { name: "imageUrl", label: "Image URL", type: "text", required: false } },
  { keys: ["category"], field: { name: "category", label: "Category", type: "text", required: false } },
  { keys: ["age"], field: { name: "age", label: "Age", type: "number", required: false } },
];

const logoPresets = [
  { keys: ["student", "education", "school"], logo: "🎓" },
  { keys: ["doctor", "patient", "clinic", "health"], logo: "⚕️" },
  { keys: ["product", "inventory", "store"], logo: "📦" },
  { keys: ["restaurant", "food", "menu"], logo: "🍽️" },
  { keys: ["finance", "expense", "invoice", "wallet"], logo: "💰" },
  { keys: ["task", "project", "todo"], logo: "✅" },
  { keys: ["travel", "booking", "hotel"], logo: "✈️" },
  { keys: ["car", "vehicle", "fleet"], logo: "🚗" },
  { keys: ["home", "property", "real estate"], logo: "🏠" },
  { keys: ["gym", "fitness", "workout"], logo: "💪" },
  { keys: ["note", "notepad", "notes"], logo: "📝" },
];

function isModernCardInstruction(i = "") { return includesAny(i, ["make cards more modern", "cards more modern", "modern cards", "premium cards", "better cards", "stylish cards", "beautiful cards", "glass cards", "rounded cards"]); }
function isCompactInstruction(i = "") { return includesAny(i, ["compact", "compact ui", "compact cards", "small cards", "dense layout", "less spacing"]); }
function isGridInstruction(i = "") { return includesAny(i, ["grid", "grid view", "gallery", "card grid", "show in grid", "change layout to grid", "two column", "2 column"]); }
function isTimelineInstruction(i = "") { return includesAny(i, ["timeline", "timeline view", "agenda", "schedule view", "rail view"]); }
function isBoardInstruction(i = "") { return includesAny(i, ["kanban", "board", "board view", "task board", "pipeline"]); }
function isTableInstruction(i = "") { return includesAny(i, ["table", "table view", "ledger", "spreadsheet", "list table"]); }
function isListInstruction(i = "") { return includesAny(i, ["list", "list view", "simple list", "vertical list"]); }
function isLoginInstruction(i = "") { return includesAny(i, ["add login", "login page", "login screen", "sign in", "signin", "authentication", "auth page"]); }
function isSignupInstruction(i = "") { return includesAny(i, ["add signup", "signup page", "signup screen", "sign up", "register page", "registration page", "create account"]); }
function isAuthInstruction(i = "") { return isLoginInstruction(i) || isSignupInstruction(i); }
function isOnboardingInstruction(i = "") { return includesAny(i, ["onboarding", "intro screen", "intro page", "welcome screen", "walkthrough", "getting started"]); }
function isSplashInstruction(i = "") { return includesAny(i, ["splash", "splash screen", "loading screen", "startup screen"]); }
function isProfileInstruction(i = "") { return includesAny(i, ["profile page", "profile screen", "user profile", "account page"]); }
function isSettingsInstruction(i = "") { return includesAny(i, ["settings page", "settings screen", "setting page", "setting screen", "preferences"]); }
function isBottomNavInstruction(i = "") { return includesAny(i, ["bottom nav", "bottom navigation", "bottom bar", "tab bar", "tabs"]); }
function isDrawerInstruction(i = "") { return includesAny(i, ["drawer", "side menu", "sidebar", "navigation drawer"]); }
function isRemoveNavInstruction(i = "") { return includesAny(i, ["remove profile", "remove settings", "remove navigation", "remove bottom nav", "remove tab bar", "remove tabs", "remove drawer", "remove side menu", "remove profile screen", "remove settings screen", "remove profile page", "remove settings page", "without profile", "without settings", "without bottom nav", "without navigation", "no profile", "no settings", "no bottom nav", "no navigation bar", "hide profile", "hide settings", "hide navigation", "hide bottom nav"]); }
function isRemoveAuthInstruction(i = "") { return includesAny(i, ["remove login", "remove signup", "remove auth", "remove sign in", "remove sign up", "without login", "without auth", "no login", "no auth", "hide login"]); }
function isRemoveSplashInstruction(i = "") { return includesAny(i, ["remove splash", "remove loading screen", "without splash", "no splash", "hide splash"]); }
function isRemoveOnboardingInstruction(i = "") { return includesAny(i, ["remove onboarding", "remove intro", "remove welcome screen", "without onboarding", "no onboarding", "hide onboarding"]); }
function isSearchInstruction(i = "") { return includesAny(i, ["add search", "search bar", "enable search"]); }
function isRemoveSearchInstruction(i = "") { return includesAny(i, ["remove search", "hide search", "without search", "no search"]); }

function detectTheme(instruction) {
  const clean = normalize(instruction);

  const preset = themePresets.find((theme) => includesAny(clean, theme.match));
  if (preset) return preset;

  const raw = String(instruction || "");
  const hexMatch = raw.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
  if (hexMatch) {
    const hex = `#${hexMatch[1]}`;
    return { name: hex, theme: { primary: hex, secondary: "#22D3EE", background: "#020617", surface: "#0F172A", text: "#FFFFFF", accent: hex } };
  }

  for (const [name, hex] of Object.entries(colorNameMap)) {
    const isNamed =
      clean.includes(`theme to ${name}`) ||
      clean.includes(`theme ${name}`) ||
      clean.includes(`${name} theme`) ||
      clean.includes(`color to ${name}`) ||
      clean.includes(`color ${name}`) ||
      clean.includes(`${name} color`) ||
      clean.includes(`change to ${name}`) ||
      clean.includes(`switch to ${name}`) ||
      clean.includes(`set to ${name}`) ||
      clean.includes(`make it ${name}`) ||
      clean.includes(`make theme ${name}`) ||
      (clean.includes(name) && hasAny(clean, ["theme", "color", "colour", "mode", "background"]));

    if (isNamed) {
      const isWhite = name === "white" || name === "light";
      return {
        name,
        theme: {
          primary: isWhite ? "#111827" : hex,
          secondary: isWhite ? "#2563EB" : hex,
          background: isWhite ? "#F8FAFC" : "#020617",
          surface: isWhite ? "#FFFFFF" : "#0F172A",
          text: isWhite ? "#0F172A" : "#FFFFFF",
          accent: isWhite ? "#2563EB" : hex,
        },
      };
    }
  }
  return null;
}

async function resolveTheme(instruction) {
  const syncDetected = detectTheme(instruction);
  if (syncDetected) return syncDetected;

  const clean = normalize(instruction);
  const isThemeRelated =
    hasAny(clean, ["theme", "color", "colour", "mode", "background", "palette", "look", "vibe", "style"]) ||
    /^(change|switch|make|set)\s+(to\s+)?[a-z\s]+$/i.test(clean);

  if (isThemeRelated) {
    try {
      const aiPalette = await extractThemePalette(instruction);
      if (aiPalette) {
        return {
          name: aiPalette.name || "Custom Palette",
          theme: aiPalette,
        };
      }
    } catch (e) {
      console.warn("AI theme extraction failed, continuing:", e.message);
    }
  }

  return null;
}

function detectFieldsToAdd(instruction) {
  const text = normalize(instruction);
  let rawSegment = null;

  const matchAfter = text.match(/(?:add|include|create|insert)\s+(?:a|an|the|new|one|extra)?\s*fields?\s+(?:called|named|for)?\s*([a-z0-9\s,+/]+)/);
  const matchBefore = text.match(/(?:add|include|create|insert)\s+([a-z0-9\s,+/]+?)\s+fields?/);

  if (matchAfter?.[1]) {
    rawSegment = matchAfter[1];
  } else if (matchBefore?.[1]) {
    rawSegment = matchBefore[1].replace(/\b(a|an|the|new|extra|custom)\b/g, "").trim();
  } else {
    const singlePreset = fieldPresets.find((item) => item.keys.some((keyword) => text.includes(normalize(keyword))));
    return singlePreset ? [clone(singlePreset.field)] : [];
  }

  const parts = rawSegment
    .replace(/\b(and|or)\b/g, ",")
    .split(/[,+/]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const fields = [];
  for (const part of parts) {
    const label = part.replace(/\b(new|a|an|the|one|extra|required|optional|field|fields)\b/g, "").trim();
    if (!label || label.length < 2) continue;

    const preset = fieldPresets.find((item) => item.keys.some((keyword) => label === normalize(keyword) || label.includes(normalize(keyword))));
    if (preset) {
      fields.push(clone(preset.field));
      continue;
    }

    let type = "text";
    if (hasAny(label, ["date"])) type = "date";
    if (hasAny(label, ["price", "amount", "age", "quantity", "number", "stock", "gpa", "score", "roll"])) type = "number";
    if (hasAny(label, ["email"])) type = "email";
    if (hasAny(label, ["phone", "mobile", "contact"])) type = "phone";
    if (hasAny(label, ["description", "notes", "details"])) type = "textarea";

    fields.push({
      name: toCamelCase(label),
      label: titleCase(label),
      type,
      required: text.includes("required"),
    });
  }

  return fields;
}

function detectRemoveField(instruction) {
  const text = normalize(instruction);
  const match = text.match(/(?:remove|delete|hide)\s+([a-z0-9\s]+?)\s+field/);
  if (!match?.[1]) return null;
  return normalize(match[1]).replace(/\b(the|a|an)\b/g, "").trim();
}

function detectRenameField(instruction) {
  const text = normalize(instruction);
  const match = text.match(/rename\s+([a-z0-9\s]+?)\s+to\s+([a-z0-9\s]+)/) || text.match(/change\s+field\s+([a-z0-9\s]+?)\s+to\s+([a-z0-9\s]+)/);
  if (!match?.[1] || !match?.[2]) return null;
  return { from: normalize(match[1]).trim(), to: normalize(match[2]).trim() };
}

function detectAppName(instruction) {
  const text = String(instruction || "").trim();
  const match = text.match(/rename\s+app\s+to\s+(.+)$/i) || text.match(/change\s+app\s+name\s+to\s+(.+)$/i) || text.match(/change\s+title\s+to\s+(.+)$/i) || text.match(/rename\s+title\s+to\s+(.+)$/i);
  if (!match?.[1]) return null;
  return match[1].replace(/[.]+$/g, "").replace(/["']/g, "").trim().slice(0, 45);
}

function detectLogo(instruction) {
  const directEmoji = String(instruction || "").match(/[\u{1F300}-\u{1FAFF}]/u);
  if (directEmoji) return directEmoji[0];
  const text = normalize(instruction);
  const match = logoPresets.find((preset) => preset.keys.some((key) => text.includes(normalize(key))));
  return match?.logo || null;
}

function findTemplateFromPromptOrCode(originalPrompt = "", existingCode = "") {
  if (originalPrompt && String(originalPrompt).trim()) {
    try {
      const match = findBestTemplate(originalPrompt);
      if (match?.matched && match.template) return match.template;
    } catch (_) {}
  }

  const codeText = compact(existingCode);
  if (!codeText) return null;

  let bestTemplate = null;
  let bestScore = 0;
  for (const template of templates || []) {
    let score = 0;
    const appName = compact(template.appName || "");
    const entity = compact(template.entity || "");
    const appType = compact(String(template.appType || "").replace(/_/g, " "));
    if (appName && codeText.includes(appName)) score += 240;
    if (entity && codeText.includes(entity)) score += 90;
    if (appType && codeText.includes(appType)) score += 150;
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }
  return bestScore >= 120 ? bestTemplate : null;
}

async function applyTheme(template, instruction, changes) {
  const detected = await resolveTheme(instruction);
  if (!detected) return;
  template.theme = { ...(template.theme || {}), ...detected.theme };
  changes.push(`Theme changed to ${detected.name}`);
}

function applyField(template, instruction, changes) {
  const fieldsToAdd = detectFieldsToAdd(instruction);
  if (!fieldsToAdd.length) return;
  const fields = Array.isArray(template.fields) ? template.fields : [];
  for (const field of fieldsToAdd) {
    const exists = fields.some(
      (item) => normalize(item.name) === normalize(field.name) || normalize(item.label) === normalize(field.label)
    );
    if (!exists) {
      fields.push(field);
      changes.push(`${field.label} field added`);
    }
  }
  template.fields = fields;
}

function applyRemoveField(template, instruction, changes) {
  const removeField = detectRemoveField(instruction);
  if (!removeField) return;
  const before = Array.isArray(template.fields) ? template.fields.length : 0;
  template.fields = (template.fields || []).filter((field) => !normalize(field.name).includes(removeField) && !normalize(field.label).includes(removeField));
  if (template.fields.length !== before) changes.push(`${titleCase(removeField)} field removed`);
}

function applyRenameField(template, instruction, changes) {
  const rename = detectRenameField(instruction);
  if (!rename) return;
  for (const field of template.fields || []) {
    if (normalize(field.name).includes(rename.from) || normalize(field.label).includes(rename.from)) {
      field.name = toCamelCase(rename.to);
      field.label = titleCase(rename.to);
      changes.push(`Field renamed to ${field.label}`);
      return;
    }
  }
}

function applyRequiredOptional(template, instruction, changes) {
  const text = normalize(instruction);
  if (!text.includes("required") && !text.includes("optional")) return;
  for (const field of template.fields || []) {
    if (text.includes(normalize(field.label)) || text.includes(normalize(field.name))) {
      field.required = text.includes("required");
      changes.push(`${field.label} marked as ${field.required ? "required" : "optional"}`);
      return;
    }
  }
}

function applyAppText(template, instruction, changes) {
  const newName = detectAppName(instruction);
  if (!newName) return;
  template.appName = newName;
  template.title = newName;
  changes.push(`App name changed to ${newName}`);
}

function applyLogo(template, instruction, changes) {
  if (!hasAny(instruction, ["logo", "icon", "emoji"])) return;
  const logo = detectLogo(instruction);
  if (!logo) return;
  template.logo = logo;
  changes.push(`Logo changed to ${logo}`);
}

function setTemplateLayout(template, layout, uiVariantNumber, cardStyle, message, changes) {
  template.layout = layout;
  template.uiVariant = Number.isFinite(Number(uiVariantNumber)) ? Number(uiVariantNumber) : 0;
  template.cardStyle = cardStyle;
  changes.push(message);
}

function applyLayout(template, instruction, changes) {
  if (isGridInstruction(instruction)) return setTemplateLayout(template, "media_grid", 21, "grid", "Layout changed to grid view", changes);
  if (isTableInstruction(instruction)) return setTemplateLayout(template, "compact_table", 31, "table", "Layout changed to table view", changes);
  if (isTimelineInstruction(instruction)) return setTemplateLayout(template, "calendar_agenda", 41, "timeline", "Layout changed to timeline view", changes);
  if (isBoardInstruction(instruction)) return setTemplateLayout(template, "kanban_board", 51, "board", "Layout changed to board view", changes);
  if (isListInstruction(instruction)) return setTemplateLayout(template, "card_stack", 11, "list", "Layout changed to list view", changes);
  if (isModernCardInstruction(instruction)) return setTemplateLayout(template, "card_stack", 71, "modern", "Cards changed to modern style", changes);
  if (isCompactInstruction(instruction)) return setTemplateLayout(template, "compact_table", 81, "compact", "Layout changed to compact style", changes);
}

function sanitizeTemplateBeforeBuild(template) {
  const safeTemplate = clone(template);
  safeTemplate.uiVariant = Number.isFinite(Number(safeTemplate.uiVariant)) ? Number(safeTemplate.uiVariant) : 0;
  safeTemplate.uiPreset = String(safeTemplate.uiPreset || "modern");
  if (!Array.isArray(safeTemplate.fields)) safeTemplate.fields = [];
  safeTemplate.fields = safeTemplate.fields.map((field, index) => ({
    name: field.name || `field${index + 1}`,
    label: field.label || titleCase(field.name || `Field ${index + 1}`),
    type: field.type || "text",
    required: Boolean(field.required),
    options: Array.isArray(field.options) ? field.options : undefined,
  }));
  return safeTemplate;
}

async function applyTextThemePatch(existingCode, instruction) {
  const detected = await resolveTheme(instruction);
  if (!detected) return { handled: false, code: existingCode, changes: [] };

  let code = existingCode;
  const palette = detected.theme || {};
  let modified = false;

  const colorReplacements = [
    { key: "primary", hex: palette.primary },
    { key: "secondary", hex: palette.secondary },
    { key: "background", hex: palette.background },
    { key: "surface", hex: palette.surface },
    { key: "text", hex: palette.text },
    { key: "accent", hex: palette.accent },
  ];

  for (const { key, hex } of colorReplacements) {
    if (!hex) continue;
    const cleanHex = hex.replace("#", "").toUpperCase();
    const regex = new RegExp(`(static\\s+const\\s+Color\\s+${key}\\s*=\\s*)Color\\(0xFF[0-9A-Fa-f]{6}\\);`, "g");
    if (regex.test(code)) {
      code = code.replace(regex, `$1Color(0xFF${cleanHex});`);
      modified = true;
    }
  }

  if (typeof palette.isLight === "boolean") {
    const targetBrightness = palette.isLight ? "Brightness.light" : "Brightness.dark";
    if (/brightness:\s*Brightness\.(?:dark|light)/.test(code)) {
      code = code.replace(/brightness:\s*Brightness\.(?:dark|light)/g, `brightness: ${targetBrightness}`);
      modified = true;
    }
  }

  if (!modified) {
    const colors = [palette.primary, palette.secondary, palette.background, palette.surface, palette.accent]
      .filter(Boolean)
      .map((color) => color.replace("#", "0xFF"));
    let index = 0;
    code = code.replace(/Color\(0xFF[0-9A-Fa-f]{6}\)/g, () => `Color(${colors[index++ % colors.length]})`);
    modified = index > 0;
  }

  return { handled: modified, code, changes: modified ? [`Theme changed to ${detected.name}`] : [] };
}

function applyTextCardPatch(existingCode, instruction) {
  let code = existingCode;
  const changes = [];
  if (isModernCardInstruction(instruction)) {
    const before = code;
    code = code
      .replace(/BorderRadius\.circular\(6\)/g, "BorderRadius.circular(20)")
      .replace(/BorderRadius\.circular\(8\)/g, "BorderRadius.circular(22)")
      .replace(/BorderRadius\.circular\(10\)/g, "BorderRadius.circular(24)")
      .replace(/BorderRadius\.circular\(12\)/g, "BorderRadius.circular(24)")
      .replace(/BorderRadius\.circular\(14\)/g, "BorderRadius.circular(24)")
      .replace(/BorderRadius\.circular\(16\)/g, "BorderRadius.circular(26)")
      .replace(/BorderRadius\.circular\(18\)/g, "BorderRadius.circular(28)")
      .replace(/BorderRadius\.circular\(20\)/g, "BorderRadius.circular(30)");
    if (code !== before) changes.push("Cards modernized");
  }
  if (isCompactInstruction(instruction)) {
    const before = code;
    code = code
      .replace(/EdgeInsets\.all\(20\)/g, "EdgeInsets.all(12)")
      .replace(/EdgeInsets\.all\(18\)/g, "EdgeInsets.all(12)")
      .replace(/EdgeInsets\.all\(16\)/g, "EdgeInsets.all(10)")
      .replace(/SizedBox\(height:\s*20\)/g, "SizedBox(height: 10)")
      .replace(/SizedBox\(height:\s*16\)/g, "SizedBox(height: 8)");
    if (code !== before) changes.push("Spacing changed to compact");
  }
  return { handled: changes.length > 0, code, changes };
}

function applyTextAppNamePatch(existingCode, instruction) {
  const newName = detectAppName(instruction);
  if (!newName) return { handled: false, code: existingCode, changes: [] };
  let code = existingCode;
  code = code.replace(/title:\s*['"][^'"]+['"]/g, `title: '${newName}'`);
  code = code.replace(/static\s+const\s+String\s+appName\s*=\s*['"][^'"]+['"];/g, `static const String appName = '${newName}';`);
  return { handled: true, code, changes: [`App title patched to ${newName}`] };
}

function authModuleCode() {
  return `
class VibeLoginPage extends StatefulWidget {
  final Widget nextPage;
  const VibeLoginPage({super.key, required this.nextPage});
  @override
  State<VibeLoginPage> createState() => _VibeLoginPageState();
}

class _VibeLoginPageState extends State<VibeLoginPage> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  void _login() {
    if (_email.text.trim().isEmpty || _password.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter email and password')));
      return;
    }
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (BuildContext context) => widget.nextPage));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 430),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(32), border: Border.all(color: Colors.white.withOpacity(0.10))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Icon(Icons.lock_rounded, color: Color(0xFF22D3EE), size: 58),
                const SizedBox(height: 24),
                const Text('Welcome Back', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text('Login to continue using this generated app.', style: TextStyle(color: Colors.white.withOpacity(0.58), fontWeight: FontWeight.w600)),
                const SizedBox(height: 28),
                TextField(controller: _email, keyboardType: TextInputType.emailAddress, style: const TextStyle(color: Colors.white), decoration: InputDecoration(labelText: 'Email', prefixIcon: const Icon(Icons.email_outlined), filled: true, fillColor: Colors.white.withOpacity(0.06), border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none))),
                const SizedBox(height: 14),
                TextField(controller: _password, obscureText: true, style: const TextStyle(color: Colors.white), decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), filled: true, fillColor: Colors.white.withOpacity(0.06), border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none))),
                const SizedBox(height: 22),
                ElevatedButton(onPressed: _login, child: const Text('Login', style: TextStyle(fontWeight: FontWeight.w900))),
                TextButton(onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (BuildContext context) => const VibeSignupPage())), child: const Text('Create new account')),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class VibeSignupPage extends StatefulWidget {
  const VibeSignupPage({super.key});
  @override
  State<VibeSignupPage> createState() => _VibeSignupPageState();
}

class _VibeSignupPageState extends State<VibeSignupPage> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  void _signup() {
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _password.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please complete all fields')));
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created. Please login.')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(backgroundColor: Colors.transparent, title: const Text('Create Account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 430),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(32), border: Border.all(color: Colors.white.withOpacity(0.10))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('Sign Up', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900)),
                const SizedBox(height: 24),
                TextField(controller: _name, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person_outline))),
                const SizedBox(height: 14),
                TextField(controller: _email, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
                const SizedBox(height: 14),
                TextField(controller: _password, obscureText: true, style: const TextStyle(color: Colors.white), decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline))),
                const SizedBox(height: 22),
                ElevatedButton(onPressed: _signup, child: const Text('Create Account', style: TextStyle(fontWeight: FontWeight.w900))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
`;
}

function onboardingModuleCode() {
  return `
class VibeOnboardingPage extends StatefulWidget {
  final Widget nextPage;
  const VibeOnboardingPage({super.key, required this.nextPage});
  @override
  State<VibeOnboardingPage> createState() => _VibeOnboardingPageState();
}

class _VibeOnboardingPageState extends State<VibeOnboardingPage> {
  int _index = 0;
  final List<Map<String, dynamic>> _pages = const [
    {'icon': Icons.auto_awesome, 'title': 'Smart Records', 'text': 'Create and manage your records with a clean generated interface.'},
    {'icon': Icons.search, 'title': 'Fast Search', 'text': 'Find records quickly and keep your workflow simple.'},
    {'icon': Icons.mobile_friendly, 'title': 'Ready to Use', 'text': 'Start using your generated app instantly.'},
  ];
  void _next() {
    if (_index < _pages.length - 1) {
      setState(() => _index += 1);
    } else {
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (BuildContext context) => widget.nextPage));
    }
  }
  @override
  Widget build(BuildContext context) {
    final page = _pages[_index];
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(children: [
            const Spacer(),
            Icon(page['icon'] as IconData, size: 90, color: const Color(0xFF22D3EE)),
            const SizedBox(height: 34),
            Text(page['title'] as String, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900)),
            const SizedBox(height: 14),
            Text(page['text'] as String, textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withOpacity(0.60), fontSize: 16, height: 1.5, fontWeight: FontWeight.w600)),
            const Spacer(),
            ElevatedButton(onPressed: _next, child: Text(_index == _pages.length - 1 ? 'Get Started' : 'Next')),
          ]),
        ),
      ),
    );
  }
}
`;
}

function splashModuleCode() {
  return `
class VibeSplashPage extends StatefulWidget {
  final Widget nextPage;
  const VibeSplashPage({super.key, required this.nextPage});
  @override
  State<VibeSplashPage> createState() => _VibeSplashPageState();
}

class _VibeSplashPageState extends State<VibeSplashPage> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1400), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (BuildContext context) => widget.nextPage));
    });
  }
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF020617),
      body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.apps_rounded, color: Color(0xFF22D3EE), size: 72),
        SizedBox(height: 24),
        Text('Loading App', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
        SizedBox(height: 16),
        CircularProgressIndicator(strokeWidth: 3),
      ])),
    );
  }
}
`;
}

function navigationModuleCode() {
  return `
class VibeNavigationShell extends StatefulWidget {
  final Widget appPage;
  final bool showDrawer;
  final bool showBottomNav;
  const VibeNavigationShell({super.key, required this.appPage, this.showDrawer = false, this.showBottomNav = true});
  @override
  State<VibeNavigationShell> createState() => _VibeNavigationShellState();
}

class _VibeNavigationShellState extends State<VibeNavigationShell> {
  int _index = 0;
  @override
  Widget build(BuildContext context) {
    final pages = [widget.appPage, const VibeProfilePage(), const VibeSettingsPage()];
    return Scaffold(
      extendBody: true,
      resizeToAvoidBottomInset: false,
      drawer: widget.showDrawer ? Drawer(child: SafeArea(child: ListView(padding: const EdgeInsets.all(16), children: [
        const ListTile(leading: Icon(Icons.apps_rounded), title: Text('Generated App'), subtitle: Text('VibeApp navigation')),
        const Divider(),
        ListTile(leading: const Icon(Icons.home_outlined), title: const Text('Home'), onTap: () { setState(() => _index = 0); Navigator.pop(context); }),
        ListTile(leading: const Icon(Icons.person_outline), title: const Text('Profile'), onTap: () { setState(() => _index = 1); Navigator.pop(context); }),
        ListTile(leading: const Icon(Icons.settings_outlined), title: const Text('Settings'), onTap: () { setState(() => _index = 2); Navigator.pop(context); }),
      ]))) : null,
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: widget.showBottomNav ? NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ) : null,
    );
  }
}

class VibeProfilePage extends StatelessWidget {
  const VibeProfilePage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(title: const Text('Profile'), backgroundColor: Colors.transparent),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(28), border: Border.all(color: Colors.white.withOpacity(0.10))),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const CircleAvatar(radius: 42, child: Icon(Icons.person, size: 42)),
            const SizedBox(height: 18),
            const Text('User Profile', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('Profile screen added locally.', style: TextStyle(color: Colors.white.withOpacity(0.55))),
          ]),
        )),
      ),
    );
  }
}

class VibeSettingsPage extends StatefulWidget {
  const VibeSettingsPage({super.key});
  @override
  State<VibeSettingsPage> createState() => _VibeSettingsPageState();
}

class _VibeSettingsPageState extends State<VibeSettingsPage> {
  bool notifications = true;
  bool darkMode = true;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(title: const Text('Settings'), backgroundColor: Colors.transparent),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        SwitchListTile(value: notifications, onChanged: (value) => setState(() => notifications = value), title: const Text('Notifications'), subtitle: const Text('Enable app notifications')),
        SwitchListTile(value: darkMode, onChanged: (value) => setState(() => darkMode = value), title: const Text('Dark Mode'), subtitle: const Text('Use dark interface')),
        const ListTile(leading: Icon(Icons.info_outline), title: Text('About'), subtitle: Text('Generated with VibeApp')),
      ]),
    );
  }
}
`;
}

function extractHomeExpression(code) {
  const regex = /home:\s*((?:const\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\([^;{}]*?\))\s*,/m;
  const match = code.match(regex);
  if (!match) return null;
  return { full: match[0], expr: match[1], regex };
}

function appendOnce(code, marker, content) {
  if (code.includes(marker)) return code;
  return `${code}\n\n${content}\n`;
}

function patchEntryFeatures(existingCode, instruction) {
  const needsAuth = isAuthInstruction(instruction);
  const needsOnboarding = isOnboardingInstruction(instruction);
  const needsSplash = isSplashInstruction(instruction);
  const needsNavigation = isBottomNavInstruction(instruction) || isDrawerInstruction(instruction) || isProfileInstruction(instruction) || isSettingsInstruction(instruction);
  if (!needsAuth && !needsOnboarding && !needsSplash && !needsNavigation) return { handled: false, code: existingCode, changes: [] };

  const home = extractHomeExpression(existingCode);
  if (!home) return { handled: false, code: existingCode, changes: [] };

  let code = existingCode;
  let homeExpr = home.expr;
  const changes = [];

  if (needsNavigation && !code.includes("class VibeNavigationShell")) {
    const showDrawer = isDrawerInstruction(instruction);
    const showBottomNav = isBottomNavInstruction(instruction) || isProfileInstruction(instruction) || isSettingsInstruction(instruction);
    homeExpr = `VibeNavigationShell(appPage: ${homeExpr}, showDrawer: ${showDrawer}, showBottomNav: ${showBottomNav})`;
    code = appendOnce(code, "class VibeNavigationShell", navigationModuleCode());
    changes.push("Navigation/Profile/Settings module added");
  }
  if (needsOnboarding && !code.includes("class VibeOnboardingPage")) {
    homeExpr = `VibeOnboardingPage(nextPage: ${homeExpr})`;
    code = appendOnce(code, "class VibeOnboardingPage", onboardingModuleCode());
    changes.push("Onboarding screens added");
  }
  if (needsAuth && !code.includes("class VibeLoginPage")) {
    homeExpr = `VibeLoginPage(nextPage: ${homeExpr})`;
    code = appendOnce(code, "class VibeLoginPage", authModuleCode());
    changes.push("Login and signup screens added");
  }
  if (needsSplash && !code.includes("class VibeSplashPage")) {
    homeExpr = `VibeSplashPage(nextPage: ${homeExpr})`;
    code = appendOnce(code, "class VibeSplashPage", splashModuleCode());
    changes.push("Splash screen added");
  }

  code = code.replace(home.regex, `home: ${homeExpr},`);
  return { handled: changes.length > 0, code, changes };
}

// ─── Remove patched screen modules ───────────────────────────────────────────
// Strips VibeNavigationShell / VibeLoginPage / VibeSplashPage / VibeOnboardingPage
// wrappers from MaterialApp home: and deletes the injected class code blocks.

function removePatchedScreens(existingCode, instruction) {
  const removeNav = isRemoveNavInstruction(instruction);
  const removeAuth = isRemoveAuthInstruction(instruction);
  const removeSplash = isRemoveSplashInstruction(instruction);
  const removeOnboarding = isRemoveOnboardingInstruction(instruction);

  if (!removeNav && !removeAuth && !removeSplash && !removeOnboarding) {
    return { handled: false, code: existingCode, changes: [] };
  }

  let code = existingCode;
  const changes = [];

  // Helper: unwrap one layer of wrapper from home: WrapperClass(... param: InnerExpr ...)
  // Works for both named-param wrappers (appPage:, nextPage:) and positional.
  function unwrapHome(wrapperClass, paramName) {
    // Matches: home: WrapperClass(...paramName: <InnerExpr>...),
    const re = new RegExp(
      `home:\\s*${wrapperClass}\\s*\\([^)]*?${paramName}:\\s*((?:const\\s+)?[A-Za-z_][A-Za-z0-9_]*\\s*\\([^)]*?\\))[^)]*?\\)\\s*,`,
      "s"
    );
    const m = code.match(re);
    if (m) {
      code = code.replace(re, `home: ${m[1]},`);
      return true;
    }
    return false;
  }

  // Helper: delete an entire class block from the file
  function deleteClassBlock(className) {
    // Matches from the class declaration line up to (and including) the closing `}` of the class,
    // handling nested braces. Uses a simple brace-counter walk on the string.
    const startMarker = `class ${className}`;
    const idx = code.indexOf(startMarker);
    if (idx === -1) return false;

    let depth = 0;
    let i = idx;
    let started = false;
    while (i < code.length) {
      if (code[i] === "{") { depth++; started = true; }
      else if (code[i] === "}") {
        depth--;
        if (started && depth === 0) {
          // Also delete a companion State class if immediately following
          code = code.slice(0, idx) + code.slice(i + 1);
          return true;
        }
      }
      i++;
    }
    return false;
  }

  if (removeNav && code.includes("VibeNavigationShell")) {
    unwrapHome("VibeNavigationShell", "appPage");
    // Delete all three navigation classes
    deleteClassBlock("VibeNavigationShell");
    deleteClassBlock("_VibeNavigationShellState");
    deleteClassBlock("VibeProfilePage");
    deleteClassBlock("VibeSettingsPage");
    deleteClassBlock("_VibeSettingsPageState");
    changes.push("Profile, Settings, and navigation bar removed");
  }

  if (removeAuth && code.includes("VibeLoginPage")) {
    unwrapHome("VibeLoginPage", "nextPage");
    deleteClassBlock("VibeLoginPage");
    deleteClassBlock("_VibeLoginPageState");
    deleteClassBlock("VibeSignupPage");
    deleteClassBlock("_VibeSignupPageState");
    changes.push("Login and signup screens removed");
  }

  if (removeSplash && code.includes("VibeSplashPage")) {
    unwrapHome("VibeSplashPage", "nextPage");
    deleteClassBlock("VibeSplashPage");
    deleteClassBlock("_VibeSplashPageState");
    changes.push("Splash screen removed");
  }

  if (removeOnboarding && code.includes("VibeOnboardingPage")) {
    unwrapHome("VibeOnboardingPage", "nextPage");
    deleteClassBlock("VibeOnboardingPage");
    deleteClassBlock("_VibeOnboardingPageState");
    changes.push("Onboarding screens removed");
  }

  // Clean up any blank lines left by deleted blocks (collapse 3+ newlines → 2)
  code = code.replace(/\n{3,}/g, "\n\n");

  return { handled: changes.length > 0, code, changes };
}

function removeSearchBarPatch(existingCode, instruction) {
  if (!isRemoveSearchInstruction(instruction)) return { handled: false, code: existingCode, changes: [] };
  const before = existingCode;
  const code = existingCode.replace(/TextField\([\s\S]{0,900}?hintText:\s*['"][^'"]*search[^'"]*['"][\s\S]{0,1200}?\),/gi, "");
  return { handled: code !== before, code, changes: code !== before ? ["Search bar removed"] : [] };
}

function addSearchBarPatch(existingCode, instruction) {
  if (!isSearchInstruction(instruction)) return { handled: false, code: existingCode, changes: [] };
  if (existingCode.toLowerCase().includes("search")) return { handled: true, code: existingCode, changes: ["Search already exists"] };
  return { handled: false, code: existingCode, changes: [] };
}

// ─── Extended local patches (no AI needed) ────────────────────────────────────

/** Detect a colour name or hex from an instruction */
function extractColorFromInstruction(instruction) {
  const raw = String(instruction || "");
  const hexMatch = raw.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
  if (hexMatch) return `#${hexMatch[1].length === 3 ? hexMatch[1].split("").map((c) => c + c).join("") : hexMatch[1]}`;
  const cn = normalize(raw);
  const colorNameMap = {
    red: "#EF4444", blue: "#2563EB", green: "#10B981", purple: "#8B5CF6",
    pink: "#EC4899", orange: "#F97316", yellow: "#FACC15", teal: "#14B8A6",
    cyan: "#00E5FF", indigo: "#6366F1", violet: "#7C3AED", black: "#020617",
    white: "#FFFFFF", gray: "#64748B", grey: "#64748B", gold: "#FACC15",
    emerald: "#10B981", rose: "#F43F5E", amber: "#F59E0B", lime: "#84CC16",
    sky: "#0EA5E9",
  };
  for (const [name, hex] of Object.entries(colorNameMap)) {
    if (cn.includes(name)) return hex;
  }
  return null;
}

/** Patch: change button / ElevatedButton background color */
function patchButtonColor(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["button color", "button colour", "button background", "change button", "make button"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const color = extractColorFromInstruction(instruction);
  if (!color) return { handled: false, code: existingCode, changes: [] };
  const hex = color.replace("#", "0xFF");
  const before = existingCode;
  // Patch ElevatedButton style or MaterialButton color
  let code = existingCode
    .replace(/ElevatedButton\.styleFrom\(\s*backgroundColor:\s*Color\(0xFF[0-9A-Fa-f]{6}\)/g,
      `ElevatedButton.styleFrom(backgroundColor: Color(${hex})`)
    .replace(/ElevatedButton\.styleFrom\(\s*primary:\s*Color\(0xFF[0-9A-Fa-f]{6}\)/g,
      `ElevatedButton.styleFrom(primary: Color(${hex})`);
  // If no existing style found, this is a raw patch; just replace all button colors in style blocks
  if (code === before) {
    code = code.replace(/backgroundColor:\s*const\s+Color\(0xFF[0-9A-Fa-f]{6}\)/g,
      `backgroundColor: const Color(${hex})`);
  }
  return { handled: code !== before, code, changes: code !== before ? [`Button color changed to ${color}`] : [] };
}

/** Patch: make buttons more rounded / pill shaped / square */
function patchButtonRadius(existingCode, instruction) {
  const text = normalize(instruction);

  const isSquare = hasAny(text, [
    "square button", "square buttons", "make button square", "make buttons square",
    "button square", "buttons square", "sharp button", "sharp buttons",
    "no rounded", "remove rounded", "rectangular button", "flat corner",
    "sharp corner", "square corner",
  ]);

  const isRounded = hasAny(text, [
    "rounded button", "pill button", "pill shape", "more rounded", "rounder button",
    "button rounded", "button radius", "circular button", "pill shaped",
  ]);

  if (!isSquare && !isRounded) return { handled: false, code: existingCode, changes: [] };

  const isPill = hasAny(text, ["pill", "circular", "fully rounded"]);
  let radius;
  if (isSquare) {
    radius = hasAny(text, ["sharp", "rectangular", "flat"]) ? 2 : 0;
  } else {
    radius = isPill ? 50 : 20;
  }

  const before = existingCode;
  // Target button shape borders
  let code = existingCode.replace(
    /RoundedRectangleBorder\(\s*borderRadius:\s*BorderRadius\.circular\(\d+(\.\d+)?\)/g,
    `RoundedRectangleBorder(borderRadius: BorderRadius.circular(${radius})`
  );
  // Also target ElevatedButton shape via BorderRadius.circular in style
  code = code.replace(
    /shape:\s*RoundedRectangleBorder\(\s*borderRadius:\s*BorderRadius\.circular\(\d+(\.\d+)?\)\s*\)/g,
    `shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${radius}))`
  );
  return {
    handled: code !== before,
    code,
    changes: code !== before ? [`Button corners changed to ${isSquare ? "square" : `rounded (${radius}px)`}`] : [],
  };
}

/** Patch: change font / text size */
function patchFontSize(existingCode, instruction) {
  const text = normalize(instruction);
  const bigger = hasAny(text, ["larger font", "bigger font", "increase font", "larger text", "bigger text", "font size bigger", "font size larger", "font size up", "increase text size"]);
  const smaller = hasAny(text, ["smaller font", "decrease font", "smaller text", "font size smaller", "font size down", "decrease text size"]);
  if (!bigger && !smaller) return { handled: false, code: existingCode, changes: [] };

  const before = existingCode;
  const code = existingCode.replace(/fontSize:\s*(\d+(\.\d+)?)/g, (_, size) => {
    const n = parseFloat(size);
    const newSize = bigger ? Math.min(n + 3, 36) : Math.max(n - 3, 10);
    return `fontSize: ${newSize}`;
  });
  return { handled: code !== before, code, changes: code !== before ? [`Font size ${bigger ? "increased" : "decreased"}`] : [] };
}

/** Patch: make title / header bold */
function patchBoldTitle(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["bold title", "bold header", "make title bold", "make header bold", "title bold", "header bold"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const before = existingCode;
  // Target TextStyle on AppBar title
  const code = existingCode.replace(
    /AppBar\([^}]{0,1500}\)/gs,
    (appBar) => appBar.replace(/FontWeight\.[a-zA-Z0-9]+/g, "FontWeight.w900")
  );
  return { handled: code !== before, code, changes: code !== before ? ["Title/header made bold"] : [] };
}

/** Patch: change card elevation */
function patchCardElevation(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["card elevation", "elevation", "shadow", "card shadow"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const numMatch = text.match(/\b(\d+)\b/);
  const elevation = numMatch ? Math.min(parseInt(numMatch[1], 10), 24) : (hasAny(text, ["remove", "no shadow", "flat"]) ? 0 : 8);
  const before = existingCode;
  const code = existingCode.replace(/elevation:\s*\d+(\.\d+)?/g, `elevation: ${elevation}`);
  return { handled: code !== before, code, changes: code !== before ? [`Card elevation changed to ${elevation}`] : [] };
}

/** Patch: dedicated header editor for VibeApp _buildHeader widget */
function patchHeader(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["header", "topbar", "top bar", "app header", "headline", "banner"])) {
    return { handled: false, code: existingCode, changes: [] };
  }

  let code = existingCode;
  const changes = [];

  // 1. Hide / remove header
  if (hasAny(text, ["remove header", "hide header", "delete header", "no header", "without header"])) {
    const before = code;
    code = code.replace(/^\s*_buildHeader\(\)\s*,\s*\n?/gm, "");
    if (code !== before) {
      return { handled: true, code, changes: ["Header removed"] };
    }
  }

  // 2. Change header title / app name
  const titleMatch =
    instruction.match(/(?:header\s+(?:title|name|text)\s+(?:to|is|as)\s+|change\s+header\s+(?:title\s+)?to\s+|rename\s+header\s+to\s+|header\s+called\s+)["']?([^"',.;\n]+)["']?/i) ||
    instruction.match(/header\s+["']([^"']+)["']/i);
  if (titleMatch?.[1]) {
    const newTitle = titleMatch[1].trim();
    if (newTitle) {
      const before = code;
      code = code.replace(/static const String appName = ['"][^'"]*['"];/, `static const String appName = '${newTitle.replace(/'/g, "\\'")}';`);
      if (code !== before) {
        changes.push(`Header title changed to "${newTitle}"`);
      }
    }
  }

  // 3. Change header subtitle / description
  const subtitleMatch =
    instruction.match(/(?:header\s+(?:subtitle|description|sub-title|sub title|caption|subtext)\s+(?:to|is|as)\s+|subtitle\s+to\s+)["']?([^"';\n]+)["']?/i);
  if (subtitleMatch?.[1]) {
    const newSubtitle = subtitleMatch[1].trim();
    if (newSubtitle) {
      const before = code;
      code = code.replace(
        /(Widget _buildHeader\(\)[\s\S]*?Text\()(?:\$?'[^']*'|'[^']*')(\s*,\s*style:\s*TextStyle\(color:\s*Colors\.black\.withOpacity\(0\.65\))/i,
        `$1'${newSubtitle.replace(/'/g, "\\'")}'$2`
      );
      if (code !== before) {
        changes.push(`Header subtitle changed to "${newSubtitle}"`);
      }
    }
  }

  // 4. Change header color / gradient
  const color = extractColorFromInstruction(instruction);
  if (color && hasAny(text, ["color", "gradient", "background", "blue", "red", "green", "emerald", "purple", "orange", "dark", "pink", "cyan", "black", "yellow", "teal", "gold"])) {
    const hex = color.replace("#", "0xFF");
    const before = code;
    code = code.replace(
      /LinearGradient\(colors:\s*<Color>\[[^\]]+\]/g,
      `LinearGradient(colors: <Color>[Color(${hex}), Color(${hex}).withOpacity(0.85)]`
    );
    if (code !== before) {
      changes.push(`Header color changed to ${color}`);
    }
  }

  // 5. Change header logo / emoji
  const directEmoji = instruction.match(/[\u{1F300}-\u{1FAFF}]/u);
  if (directEmoji) {
    const before = code;
    code = code.replace(/static const String logo = ['"][^'"]*['"];/, `static const String logo = '${directEmoji[0]}';`);
    if (code !== before) {
      changes.push(`Header logo changed to ${directEmoji[0]}`);
    }
  }

  if (changes.length > 0) {
    return { handled: true, code, changes };
  }

  return { handled: false, code: existingCode, changes: [] };
}

/** Patch: change app bar / header background color */
function patchAppBarColor(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["app bar color", "appbar color", "header color", "header background", "app bar background", "appbar background", "navbar color", "change app bar"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const color = extractColorFromInstruction(instruction);
  if (!color) return { handled: false, code: existingCode, changes: [] };
  const hex = color.replace("#", "0xFF");
  const before = existingCode;
  let code = existingCode;

  // 1. Update _buildHeader gradient in VibeApp factories
  code = code.replace(
    /LinearGradient\(colors:\s*<Color>\[[^\]]+\]/g,
    `LinearGradient(colors: <Color>[Color(${hex}), Color(${hex}).withOpacity(0.85)]`
  );

  // 2. Update AppBar if present
  code = code.replace(/AppBar\([^)]{0,1500}\)/gs, (appBar) =>
    appBar.replace(/backgroundColor:\s*(?:const\s+)?Color\(0xFF[0-9A-Fa-f]{6}\)/g, `backgroundColor: Color(${hex})`)
  );
  return { handled: code !== before, code, changes: code !== before ? [`Header color changed to ${color}`] : [] };
}

/** Patch: add border to cards */
function patchAddCardBorder(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["add border", "card border", "border to card", "bordered card"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  if (hasAny(text, ["remove", "no border", "without border"])) return { handled: false, code: existingCode, changes: [] };
  const before = existingCode;
  // Add border to Card or Container decoration
  const code = existingCode.replace(/BoxDecoration\(([^)]{0,600})\)/g, (match, inner) => {
    if (inner.includes("border:")) return match;
    return `BoxDecoration(${inner}, border: Border.all(color: Colors.white.withOpacity(0.18), width: 1.2))`;
  });
  return { handled: code !== before, code, changes: code !== before ? ["Card border added"] : [] };
}

/** Patch: remove border from cards */
function patchRemoveCardBorder(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["remove border", "no border", "without border", "borderless"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const before = existingCode;
  const code = existingCode.replace(/,?\s*border:\s*Border\.all\([^)]{0,200}\)/g, "");
  return { handled: code !== before, code, changes: code !== before ? ["Card border removed"] : [] };
}

/** Patch: change all card border radius to a specific value */
function patchBorderRadius(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["border radius", "corner radius", "rounded corners", "change radius"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const numMatch = text.match(/\b(\d+)\b/);
  if (!numMatch) return { handled: false, code: existingCode, changes: [] };
  const radius = Math.min(parseInt(numMatch[1], 10), 50);
  const before = existingCode;
  const code = existingCode.replace(/BorderRadius\.circular\(\d+(\.\d+)?\)/g, `BorderRadius.circular(${radius})`);
  return { handled: code !== before, code, changes: code !== before ? [`Border radius changed to ${radius}px`] : [] };
}

/** Patch: center-align or left-align text */
function patchTextAlignment(existingCode, instruction) {
  const text = normalize(instruction);
  const center = hasAny(text, ["center align", "centre align", "center text", "align center", "text center"]);
  const left = hasAny(text, ["left align", "align left", "text left"]);
  if (!center && !left) return { handled: false, code: existingCode, changes: [] };
  const alignment = center ? "TextAlign.center" : "TextAlign.left";
  const before = existingCode;
  const code = existingCode.replace(/textAlign:\s*TextAlign\.\w+/g, `textAlign: ${alignment}`);
  return { handled: code !== before, code, changes: code !== before ? [`Text aligned to ${center ? "center" : "left"}`] : [] };
}

/** Patch: hide or show the FAB (FloatingActionButton) */
function patchFab(existingCode, instruction) {
  const text = normalize(instruction);
  const hide = hasAny(text, ["hide fab", "remove fab", "hide floating", "remove floating", "no fab", "remove add button", "hide add button"]);
  const show = hasAny(text, ["show fab", "add fab", "show floating", "show add button"]);
  if (!hide && !show) return { handled: false, code: existingCode, changes: [] };
  const before = existingCode;
  let code = existingCode;
  if (hide) {
    code = code.replace(/floatingActionButton:\s*FloatingActionButton\([^;]{0,600}?\),?\n/gs, "");
  }
  return { handled: code !== before, code, changes: code !== before ? [hide ? "FAB hidden" : "FAB shown"] : [] };
}

/** Patch: change padding values */
function patchPadding(existingCode, instruction) {
  const text = normalize(instruction);
  if (!hasAny(text, ["change padding", "increase padding", "decrease padding", "more padding", "less padding", "padding to"])) {
    return { handled: false, code: existingCode, changes: [] };
  }
  const numMatch = text.match(/\b(\d+)\b/);
  if (!numMatch) {
    // Increase or decrease relatively
    const increase = hasAny(text, ["more padding", "increase padding", "larger padding"]);
    const before = existingCode;
    const code = existingCode.replace(/EdgeInsets\.all\((\d+(\.\d+)?)\)/g, (_, n) => {
      const val = parseFloat(n);
      return `EdgeInsets.all(${increase ? Math.min(val + 4, 40) : Math.max(val - 4, 4)})`;
    });
    return { handled: code !== before, code, changes: code !== before ? [`Padding ${increase ? "increased" : "decreased"}`] : [] };
  }
  const padValue = Math.min(parseInt(numMatch[1], 10), 64);
  const before = existingCode;
  const code = existingCode.replace(/EdgeInsets\.all\(\d+(\.\d+)?\)/g, `EdgeInsets.all(${padValue})`);
  return { handled: code !== before, code, changes: code !== before ? [`Padding changed to ${padValue}`] : [] };
}

/** Patch: make background darker or lighter */
function patchBackgroundLightness(existingCode, instruction) {
  const text = normalize(instruction);
  const darker = hasAny(text, ["darker background", "make background dark", "dark background", "darken background"]);
  const lighter = hasAny(text, ["lighter background", "make background light", "light background", "lighten background"]);
  if (!darker && !lighter) return { handled: false, code: existingCode, changes: [] };
  const before = existingCode;
  // Swap the dominant background Color — replaces the first scaffold background occurrence
  let code = existingCode;
  if (darker) {
    code = code.replace(/backgroundColor:\s*const\s+Color\(0xFFEFF6FF\)/g, "backgroundColor: const Color(0xFF020617)");
    code = code.replace(/backgroundColor:\s*const\s+Color\(0xFFF8FAFC\)/g, "backgroundColor: const Color(0xFF020617)");
  } else {
    code = code.replace(/backgroundColor:\s*const\s+Color\(0xFF020617\)/g, "backgroundColor: const Color(0xFFF8FAFC)");
    code = code.replace(/backgroundColor:\s*const\s+Color\(0xFF0F172A\)/g, "backgroundColor: const Color(0xFFFFFFFF)");
  }
  return { handled: code !== before, code, changes: code !== before ? [`Background made ${darker ? "darker" : "lighter"}`] : [] };
}

/**
 * applyExtendedLocalPatch — run all extended patches in sequence.
 * Called AFTER applyLocalCodeEdit fails (localResult.handled === false)
 * and BEFORE falling back to Groq.
 */
function applyExtendedLocalPatch({ instruction, existingCode }) {
  const patches = [
    () => patchHeader(existingCode, instruction),
    () => patchButtonColor(existingCode, instruction),
    () => patchButtonRadius(existingCode, instruction),
    () => patchFontSize(existingCode, instruction),
    () => patchBoldTitle(existingCode, instruction),
    () => patchCardElevation(existingCode, instruction),
    () => patchAppBarColor(existingCode, instruction),
    () => patchAddCardBorder(existingCode, instruction),
    () => patchRemoveCardBorder(existingCode, instruction),
    () => patchBorderRadius(existingCode, instruction),
    () => patchTextAlignment(existingCode, instruction),
    () => patchFab(existingCode, instruction),
    () => patchPadding(existingCode, instruction),
    () => patchBackgroundLightness(existingCode, instruction),
  ];

  for (const runPatch of patches) {
    const result = runPatch();
    if (result.handled) {
      return {
        handled: true,
        code: sanitizeGeneratedFlutterCode(result.code),
        source: "local-extended-patch",
        changes: result.changes,
        message: `Updated locally: ${result.changes.join(", ")}`,
      };
    }
  }

  return { handled: false, code: existingCode, source: "not-handled", changes: [] };
}

// ─── Text patches (existing) ─────────────────────────────────────────────────

async function applyTextPatches(existingCode, instruction) {
  let code = existingCode;
  const changes = [];
  const patches = [
    () => applyTextThemePatch(code, instruction),
    () => applyTextCardPatch(code, instruction),
    () => applyTextAppNamePatch(code, instruction),
    () => removeSearchBarPatch(code, instruction),
    () => addSearchBarPatch(code, instruction),
    () => removePatchedScreens(code, instruction),
    () => patchEntryFeatures(code, instruction),
  ];
  for (const runPatch of patches) {
    const result = await runPatch();
    if (result.handled) {
      code = result.code;
      changes.push(...result.changes);
    }
  }
  return { handled: changes.length > 0, code: sanitizeGeneratedFlutterCode(code), changes };
}

function isSupabaseCode(code = "") {
  if (!code || typeof code !== "string") return false;
  return (
    code.includes("package:supabase_flutter/supabase_flutter.dart") ||
    code.includes("Supabase.initialize") ||
    code.includes("Supabase.instance")
  );
}

function extractSupabaseConfigFromCode(code = "") {
  if (!code || typeof code !== "string") return {};

  let supabaseUrl = "";
  let supabaseAnonKey = "";
  let tableName = "";

  const urlMatch = code.match(/url:\s*['"]([^'"]+)['"]/);
  if (urlMatch) supabaseUrl = urlMatch[1];

  const keyMatch = code.match(/anonKey:\s*['"]([^'"]+)['"]/);
  if (keyMatch) supabaseAnonKey = keyMatch[1];

  const tableMatch = code.match(/static const String tableName =\s*['"]([^'"]+)['"]/);
  if (tableMatch) {
    tableName = tableMatch[1];
  } else {
    const fromMatch = code.match(/supabase\.from\(\s*['"]([^'"]+)['"]\s*\)/);
    if (fromMatch) tableName = fromMatch[1];
  }

  return { supabaseUrl, supabaseAnonKey, tableName };
}

function reconstructAppConfigFromCode(code = "", originalPrompt = "") {
  if (!code || typeof code !== "string") return null;

  const appNameMatch = code.match(/static const String appName =\s*['"]([^'"]+)['"]/);
  const entityMatch = code.match(/static const String entity =\s*['"]([^'"]+)['"]/);
  const domainMatch = code.match(/static const String domain =\s*['"]([^'"]+)['"]/);
  const logoMatch = code.match(/static const String logo =\s*['"]([^'"]+)['"]/);
  const layoutMatch = code.match(/static const String layout =\s*['"]([^'"]+)['"]/);
  const uiPresetMatch = code.match(/static const String uiPreset =\s*['"]([^'"]+)['"]/);
  const tableMatch = code.match(/static const String tableName =\s*['"]([^'"]+)['"]/);

  const primaryMatch = code.match(/static const Color primary = Color\(0xFF([0-9A-Fa-f]{6})\)/);
  const bgMatch = code.match(/static const Color background = Color\(0xFF([0-9A-Fa-f]{6})\)/);
  const surfaceMatch = code.match(/static const Color surface = Color\(0xFF([0-9A-Fa-f]{6})\)/);
  const textMatch = code.match(/static const Color text = Color\(0xFF([0-9A-Fa-f]{6})\)/);
  const accentMatch = code.match(/static const Color accent = Color\(0xFF([0-9A-Fa-f]{6})\)/);

  const statsMatch = code.match(/static const bool hasStatsSummary =\s*(true|false)/);
  const filterMatch = code.match(/static const bool hasFilterChips =\s*(true|false)/);
  const deleteConfirmMatch = code.match(/static const bool hasDeleteConfirm =\s*(true|false)/);
  const splashMatch = code.match(/static const bool hasSplash =\s*(true|false)/);
  const dashboardMatch = code.match(/static const bool hasDashboard =\s*(true|false)/);
  const profileMatch = code.match(/static const bool hasProfile =\s*(true|false)/);
  const settingsMatch = code.match(/static const bool hasSettings =\s*(true|false)/);
  const authMatch = code.match(/static const bool hasAuth =\s*(true|false)/);
  const allowSignupMatch = code.match(/static const bool allowSignup =\s*(true|false)/);
  const navigationMatch = code.match(/static const String navigation =\s*['"]([^'"]+)['"]/);

  const fields = [];
  const roles = [];
  const roleRegex = /VibeDemoUser\([^)]*role:\s*['"]([^'"]+)['"]/g;
  let roleMatch;
  while ((roleMatch = roleRegex.exec(code)) !== null) {
    if (!roles.includes(roleMatch[1])) roles.push(roleMatch[1]);
  }
  const fieldRegex = /AppField\s*\(\s*name:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]\s*,\s*type:\s*['"]([^'"]+)['"]\s*,\s*required:\s*(true|false)(?:\s*,\s*options:\s*<String>\[([\s\S]*?)\])?\s*,?\s*\)/g;
  let match;
  while ((match = fieldRegex.exec(code)) !== null) {
    const rawOptions = match[5] ? match[5].split(",").map((s) => s.replace(/['"\s]/g, "")).filter(Boolean) : [];
    fields.push({
      name: match[1],
      label: match[2],
      type: match[3],
      required: match[4] === "true",
      ...(rawOptions.length ? { options: rawOptions } : {}),
    });
  }

  const entity = entityMatch ? entityMatch[1] : "Record";

  return {
    appName: appNameMatch ? appNameMatch[1] : "Generated App",
    entity,
    domain: domainMatch ? domainMatch[1] : "Business",
    logo: logoMatch ? logoMatch[1] : "✨",
    layout: layoutMatch ? layoutMatch[1] : "card_stack",
    uiPreset: uiPresetMatch ? uiPresetMatch[1] : "modern",
    theme: {
      primary: primaryMatch ? `#${primaryMatch[1]}` : "#22D3EE",
      background: bgMatch ? `#${bgMatch[1]}` : "#020617",
      surface: surfaceMatch ? `#${surfaceMatch[1]}` : "#0F172A",
      text: textMatch ? `#${textMatch[1]}` : "#FFFFFF",
      accent: accentMatch ? `#${accentMatch[1]}` : "#10B981",
    },
    fields: fields.length ? fields : [],
    features: {
      hasStatsSummary: statsMatch ? statsMatch[1] === "true" : false,
      hasFilterChips: filterMatch ? filterMatch[1] === "true" : false,
      hasDeleteConfirm: deleteConfirmMatch ? deleteConfirmMatch[1] === "true" : true,
      hasSplash: splashMatch ? splashMatch[1] === "true" : false,
      hasDashboard: dashboardMatch ? dashboardMatch[1] === "true" : false,
      hasProfile: profileMatch ? profileMatch[1] === "true" : false,
      hasSettings: settingsMatch ? settingsMatch[1] === "true" : false,
      hasAuth: authMatch ? authMatch[1] === "true" : false,
      allowSignup: allowSignupMatch ? allowSignupMatch[1] === "true" : true,
      roles,
      navigation: navigationMatch ? navigationMatch[1] : "none",
    },
    tableName: tableMatch ? tableMatch[1] : undefined,
  };
}

function patchAppProfileTheme(code, theme) {
  let patched = code;
  if (theme.primary) {
    const hex = theme.primary.replace("#", "").toUpperCase();
    patched = patched.replace(/static const Color primary = Color\(0x[0-9A-Fa-f]{8}\);/, `static const Color primary = Color(0xFF${hex});`);
  }
  if (theme.secondary) {
    const hex = theme.secondary.replace("#", "").toUpperCase();
    patched = patched.replace(/static const Color secondary = Color\(0x[0-9A-Fa-f]{8}\);/, `static const Color secondary = Color(0xFF${hex});`);
  }
  if (theme.background) {
    const hex = theme.background.replace("#", "").toUpperCase();
    patched = patched.replace(/static const Color background = Color\(0x[0-9A-Fa-f]{8}\);/, `static const Color background = Color(0xFF${hex});`);
  }
  if (theme.surface) {
    const hex = theme.surface.replace("#", "").toUpperCase();
    patched = patched.replace(/static const Color surface = Color\(0x[0-9A-Fa-f]{8}\);/, `static const Color surface = Color(0xFF${hex});`);
  }
  if (theme.text) {
    const hex = theme.text.replace("#", "").toUpperCase();
    patched = patched.replace(/static const Color text = Color\(0x[0-9A-Fa-f]{8}\);/, `static const Color text = Color(0xFF${hex});`);
  }
  if (theme.accent) {
    const hex = theme.accent.replace("#", "").toUpperCase();
    patched = patched.replace(/static const Color accent = Color\(0x[0-9A-Fa-f]{8}\);/, `static const Color accent = Color(0xFF${hex});`);
  }
  return patched;
}

function patchAppProfileTitle(code, appName) {
  const safeName = String(appName || "").replace(/'/g, "\\'");
  return code.replace(/static const String appName = ['"][^'"]*['"];/, `static const String appName = '${safeName}';`);
}

function patchAppProfileFeature(code, feature, value) {
  const regex = new RegExp(`static const bool ${feature} = (?:true|false);`);
  return code.replace(regex, `static const bool ${feature} = ${Boolean(value)};`);
}

function patchAppProfileNavigation(code, navigation) {
  return code.replace(
    /static const String navigation = ['"][^'"]*['"];/,
    `static const String navigation = '${navigation}';`
  );
}

function extractFieldsFromCode(code = "") {
  if (!code || typeof code !== "string") return [];
  const fields = [];
  const seen = new Set();

  const addField = (name, label) => {
    const key = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    fields.push({ name, label: label || titleCase(name) });
  };

  // 1. AppField declarations
  const fieldRegex = /AppField\s*\(\s*name:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = fieldRegex.exec(code)) !== null) {
    addField(match[1], match[2]);
  }

  // 2. Controller patterns: e.g. _dueDateController, _dateController
  const ctrlRegex = /TextEditingController\s+(?:_)?([a-zA-Z0-9]+)Controller\b/g;
  while ((match = ctrlRegex.exec(code)) !== null) {
    const name = match[1];
    addField(name, titleCase(name));
  }

  // 3. Form input labelText: 'Due Date' or hintText: 'Due Date'
  const labelRegex = /(?:labelText|hintText)\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = labelRegex.exec(code)) !== null) {
    const label = match[1].trim();
    if (label && label.length < 30 && !label.includes("$")) {
      addField(toCamelCase(label), label);
    }
  }

  // 4. Direct checks for common fields in task / crud apps
  if (/dueDate|due_date|due\s*date/i.test(code)) {
    addField("dueDate", "Due Date");
  }
  if (/priority/i.test(code)) {
    addField("priority", "Priority");
  }
  if (/status/i.test(code)) {
    addField("status", "Status");
  }

  return fields;
}

function isFieldMatch(targetName = "", field = {}) {
  const tNorm = normalize(targetName).replace(/\b(a|an|the|field|fields|new)\b/g, "").trim();
  const tCompact = compact(targetName).replace(/(field|fields|new)/g, "");
  const fNameNorm = normalize(field.name || "");
  const fNameCompact = compact(field.name || "");
  const fLabelNorm = normalize(field.label || "");
  const fLabelCompact = compact(field.label || "");

  if (
    tNorm === fNameNorm ||
    tNorm === fLabelNorm ||
    tCompact === fNameCompact ||
    tCompact === fLabelCompact
  ) {
    return true;
  }

  // Handle due date / deadline equivalence
  if ((tCompact.includes("duedate") || tCompact.includes("deadline") || tCompact === "due") &&
      (fNameCompact.includes("duedate") || fLabelCompact.includes("duedate") || fNameCompact.includes("deadline") || fLabelCompact.includes("deadline"))) {
    return true;
  }

  const targetWords = tNorm.split(" ").filter((w) => w && !["a", "an", "the", "field", "fields"].includes(w));
  if (targetWords.length >= 2 && targetWords.every((w) => fLabelNorm.includes(w) || fNameNorm.includes(w))) {
    return true;
  }

  return false;
}

function extractTargetAddFields(instruction = "") {
  const clean = normalize(instruction);

  const matchAfterField = clean.match(/(?:add|include|create|insert)\s+(?:a|an|the|new|extra|one)?\s*fields?\s+(?:called|named|for)?\s*([a-z0-9\s,+/]+)/i);
  if (matchAfterField) {
    const raw = matchAfterField[1].trim();
    if (raw.length >= 2) {
      return raw.split(/\b(?:and|or)\b|[,+/]/).map((s) => s.trim()).filter((s) => s.length >= 2 && !["a", "an", "the", "field", "fields"].includes(s));
    }
  }

  const matchBeforeField = clean.match(/(?:add|include|create|insert)\s+([a-z0-9\s,+/]+?)\s+fields?/i);
  if (matchBeforeField) {
    const raw = matchBeforeField[1].replace(/\b(a|an|the|new|extra|custom)\b/gi, "").trim();
    const parts = raw.split(/\b(?:and|or)\b|[,+/]/).map((s) => s.trim()).filter((s) => s.length >= 2 && !["a", "an", "the", "field", "fields"].includes(s));
    if (parts.length) return parts;
  }

  const simpleMatch = clean.match(/^(?:add|include|create)\s+(?:a|an|the|new)?\s*([a-z0-9\s]+)$/i);
  if (simpleMatch) {
    const candidate = simpleMatch[1].trim();
    const isOther = /\b(theme|mode|color|colour|grid|table|timeline|kanban|list|search|stats|filter|chip|login|signup|auth|profile|settings|page|screen)\b/i.test(candidate);
    if (!isOther && candidate.length >= 2 && !["a", "an", "the", "field", "fields"].includes(candidate)) {
      return [candidate];
    }
  }

  return [];
}

function checkIfAlreadyApplied(existingCode = "", instruction = "", activeConfig = null) {
  if (!existingCode || !instruction) return null;

  // 1. Check fields
  const fields = (activeConfig?.fields && activeConfig.fields.length > 0)
    ? activeConfig.fields
    : extractFieldsFromCode(existingCode);

  const targetAddFields = extractTargetAddFields(instruction);
  if (targetAddFields.length > 0) {
    for (const target of targetAddFields) {
      // Check in discovered fields
      const match = fields.find((f) => isFieldMatch(target, f));
      if (match) {
        return {
          alreadyApplied: true,
          type: "field",
          name: match.name,
          label: match.label,
          message: `The field "${match.label || match.name}" is already present in this app.`,
        };
      }

      // Check directly in existing code text
      const tCompact = compact(target).replace(/(field|fields|new)/g, "");
      if (tCompact === "duedate" || tCompact === "deadline" || tCompact === "due") {
        if (/dueDate|due_date|Due\s*Date|deadline/i.test(existingCode)) {
          return {
            alreadyApplied: true,
            type: "field",
            name: "dueDate",
            label: "Due Date",
            message: `The field "Due Date" is already present in this app.`,
          };
        }
      }
    }
  }

  // 2. Check layout
  if (/\b(grid|catalog|gallery)\b/i.test(instruction) && (existingCode.includes("layout = 'media_grid'") || existingCode.includes("layout = 'catalog_grid'"))) {
    return { alreadyApplied: true, type: "layout", message: "The app is already using the grid layout." };
  }
  if (/\b(table|ledger|spreadsheet)\b/i.test(instruction) && (existingCode.includes("layout = 'compact_table'") || existingCode.includes("layout = 'ledger_table'"))) {
    return { alreadyApplied: true, type: "layout", message: "The app is already using the table layout." };
  }
  if (/\b(timeline|agenda)\b/i.test(instruction) && (existingCode.includes("layout = 'calendar_agenda'") || existingCode.includes("layout = 'timeline_rail'"))) {
    return { alreadyApplied: true, type: "layout", message: "The app is already using the timeline layout." };
  }
  if (/\b(kanban|board)\b/i.test(instruction) && (existingCode.includes("layout = 'kanban_board'"))) {
    return { alreadyApplied: true, type: "layout", message: "The app is already using the kanban board layout." };
  }

  // 3. Check features
  if (/\b(enable|add|show)\s+(?:a\s+)?search\b/i.test(instruction) && (existingCode.includes("_searchController") || existingCode.includes("searchQuery"))) {
    return { alreadyApplied: true, type: "feature", message: "Search is already enabled in this app." };
  }
  if (/\b(enable|add|show)\s+(?:the\s+)?stats\b/i.test(instruction) && existingCode.includes("hasStatsSummary = true")) {
    return { alreadyApplied: true, type: "feature", message: "Stats summary is already enabled in this app." };
  }
  if (/\b(enable|add|show)\s+(?:the\s+)?filter\b/i.test(instruction) && existingCode.includes("hasFilterChips = true")) {
    return { alreadyApplied: true, type: "feature", message: "Filter chips are already enabled in this app." };
  }

  return null;
}

async function applyLocalCodeEdit({
  instruction,
  existingCode,
  originalPrompt,
  supabaseConfig = null,
  storageMode = "",
  appConfig = null,
}) {
  const changes = [];

  const isSupabase =
    storageMode === "supabase" ||
    supabaseConfig?.storageMode === "supabase" ||
    Boolean(supabaseConfig?.supabaseUrl) ||
    isSupabaseCode(existingCode);

  const extracted = isSupabase ? extractSupabaseConfigFromCode(existingCode) : {};
  const effectiveUrl = supabaseConfig?.supabaseUrl || extracted.supabaseUrl || "";
  const effectiveKey = supabaseConfig?.supabaseAnonKey || extracted.supabaseAnonKey || "";
  const effectiveTable = supabaseConfig?.supabaseTable || extracted.tableName || "";

  let generatedTableSql = null;
  let finalTableName = effectiveTable;

  const activeConfig = appConfig ? clone(appConfig) : reconstructAppConfigFromCode(existingCode, originalPrompt);

  // ─── Guard: Check if change is ALREADY applied ───────────────────────────
  const alreadyCheck = checkIfAlreadyApplied(existingCode, instruction, activeConfig);
  if (alreadyCheck) {
    return {
      handled: true,
      alreadyApplied: true,
      code: sanitizeGeneratedFlutterCode(existingCode),
      source: "already-applied",
      changes: [],
      message: alreadyCheck.message,
      storageMode: isSupabase ? "supabase" : "local",
      tableSql: supabaseConfig?.tableSql || null,
      tableName: finalTableName,
      appConfig: activeConfig,
    };
  }

  // ─── 1. Try Config-Driven Edit First ──────────────────────────────────────
  if (activeConfig) {
    try {
      const intent = await parseEditIntent(instruction, activeConfig);
      if (intent && intent.action && intent.action !== "CUSTOM" && intent.action !== "NONE") {
        let applied = false;
        const editChanges = [];

        if (intent.action === "AUTH_CHANGE") {
          activeConfig.features = activeConfig.features || {};
          const currentEnabled = Boolean(activeConfig.features.hasAuth);
          const requestedRoles = Array.isArray(intent.roles) ? intent.roles : [];
          const currentRoles = Array.isArray(activeConfig.features.roles) ? activeConfig.features.roles : [];
          const sameRoles = JSON.stringify(currentRoles.map(normalize)) === JSON.stringify(requestedRoles.map(normalize));
          if (currentEnabled === Boolean(intent.enabled) && (!intent.enabled || sameRoles)) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: intent.enabled ? "Role-based authentication is already configured with these roles." : "Authentication is already disabled.",
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.features.hasAuth = Boolean(intent.enabled);
          activeConfig.features.allowSignup = intent.enabled ? intent.allowSignup !== false : false;
          activeConfig.features.roles = intent.enabled ? requestedRoles : [];
          editChanges.push(intent.message || (intent.enabled ? "Role-based authentication added" : "Authentication removed"));
          applied = true;
        } else if (intent.action === "TOGGLE_FEATURE" && intent.feature) {
          activeConfig.features = activeConfig.features || {};
          if (activeConfig.features[intent.feature] === intent.value) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `This feature is already ${intent.value ? "enabled" : "disabled"} in your app.`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.features[intent.feature] = intent.value;
          editChanges.push(intent.message || `Feature ${intent.feature} set to ${intent.value}`);
          applied = true;
        } else if (intent.action === "NAVIGATION_CHANGE" && intent.navigation) {
          activeConfig.features = activeConfig.features || {};
          if (activeConfig.features.navigation === intent.navigation) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `The app already uses ${intent.navigation} navigation.`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.features.navigation = intent.navigation;
          editChanges.push(intent.message || `Navigation changed to ${intent.navigation}`);
          applied = true;
        } else if (intent.action === "ADD_FIELDS" && Array.isArray(intent.fields)) {
          activeConfig.fields = activeConfig.fields || [];
          for (const newField of intent.fields) {
            const exists = activeConfig.fields.some(
              (f) => isFieldMatch(newField.name, f) || isFieldMatch(newField.label, f)
            );
            if (!exists) {
              activeConfig.fields.push(newField);
              editChanges.push(`${newField.label} field added`);
              applied = true;
            }
          }
          if (!applied && intent.fields.length > 0) {
            const fieldNames = intent.fields.map((f) => `"${f.label || f.name}"`).join(", ");
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `The field ${fieldNames} is already present in this app.`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
        } else if (intent.action === "REMOVE_FIELD" && intent.fieldName) {
          const beforeLen = activeConfig.fields?.length || 0;
          activeConfig.fields = (activeConfig.fields || []).filter(
            (f) => !isFieldMatch(intent.fieldName, f)
          );
          if (activeConfig.fields.length !== beforeLen) {
            editChanges.push(intent.message || `Field ${intent.fieldName} removed`);
            applied = true;
          } else {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `The field "${intent.fieldName}" does not exist in this app.`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
        } else if (intent.action === "THEME_CHANGE" && intent.theme) {
          const currentTheme = activeConfig.theme || {};
          const isSamePrimary =
            intent.theme.primary &&
            currentTheme.primary &&
            intent.theme.primary.toLowerCase() === currentTheme.primary.toLowerCase();
          if (isSamePrimary) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: "This theme is already applied to the app.",
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.theme = { ...(activeConfig.theme || {}), ...intent.theme };
          editChanges.push(intent.message || "Theme updated");
          applied = true;
        } else if (intent.action === "LAYOUT_CHANGE" && intent.layout) {
          if (activeConfig.layout === intent.layout) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `The app is already using the ${intent.layout.replace("_", " ")} layout.`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.layout = intent.layout;
          editChanges.push(intent.message || `Layout changed to ${intent.layout}`);
          applied = true;
        } else if (intent.action === "UI_PRESET_CHANGE" && intent.uiPreset) {
          if (activeConfig.uiPreset === intent.uiPreset) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `The ${intent.uiPreset} UI template is already active.`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.uiPreset = intent.uiPreset;
          editChanges.push(intent.message || `UI template changed to ${intent.uiPreset}`);
          applied = true;
        } else if (intent.action === "APP_NAME" && intent.appName) {
          if (normalize(activeConfig.appName) === normalize(intent.appName)) {
            return {
              handled: true,
              alreadyApplied: true,
              code: sanitizeGeneratedFlutterCode(existingCode),
              source: "already-applied",
              changes: [],
              message: `The app name is already "${intent.appName}".`,
              storageMode: isSupabase ? "supabase" : "local",
              tableSql: supabaseConfig?.tableSql || null,
              tableName: finalTableName,
              appConfig: activeConfig,
            };
          }
          activeConfig.appName = intent.appName;
          editChanges.push(`App title changed to ${intent.appName}`);
          applied = true;
        }

        if (applied && editChanges.length > 0) {
          // Check if this can be patched in-place in existing code to preserve custom widgets
          const canPatchInPlace =
            intent.action === "THEME_CHANGE" ||
            intent.action === "APP_NAME" ||
            intent.action === "TOGGLE_FEATURE" ||
            intent.action === "NAVIGATION_CHANGE";

          if (canPatchInPlace && existingCode.includes("class AppProfile")) {
            let inPlaceCode = existingCode;
            if (intent.action === "THEME_CHANGE" && intent.theme) {
              inPlaceCode = patchAppProfileTheme(inPlaceCode, intent.theme);
            } else if (intent.action === "APP_NAME" && intent.appName) {
              inPlaceCode = patchAppProfileTitle(inPlaceCode, intent.appName);
            } else if (intent.action === "TOGGLE_FEATURE" && intent.feature) {
              inPlaceCode = patchAppProfileFeature(inPlaceCode, intent.feature, intent.value);
            } else if (intent.action === "NAVIGATION_CHANGE" && intent.navigation) {
              inPlaceCode = patchAppProfileNavigation(inPlaceCode, intent.navigation);
            }

            if (inPlaceCode !== existingCode) {
              return {
                handled: true,
                code: sanitizeGeneratedFlutterCode(inPlaceCode),
                source: isSupabase ? "in-place-supabase-edit" : "in-place-local-edit",
                changes: editChanges,
                message: `Updated in-place: ${editChanges.join(", ")}`,
                storageMode: isSupabase ? "supabase" : "local",
                tableSql: generatedTableSql,
                tableName: finalTableName,
                appConfig: activeConfig,
              };
            }
          }

          let code;
          if (isSupabase) {
            const supabaseResult = buildFlutterSupabaseCrudApp({
              template: activeConfig,
              supabaseUrl: effectiveUrl,
              supabaseAnonKey: effectiveKey,
              tableName: finalTableName || activeConfig.tableName || "",
            });
            code = sanitizeGeneratedFlutterCode(supabaseResult.code);
            generatedTableSql = supabaseResult.tableSql;
            finalTableName = supabaseResult.tableName;
          } else {
            code = sanitizeGeneratedFlutterCode(buildFlutterCrudApp(activeConfig));
          }

          return {
            handled: true,
            code,
            source: isSupabase ? "config-driven-supabase-edit" : "config-driven-local-edit",
            changes: editChanges,
            message: `Updated: ${editChanges.join(", ")}`,
            storageMode: isSupabase ? "supabase" : "local",
            tableSql: generatedTableSql,
            tableName: finalTableName,
            appConfig: activeConfig,
          };
        }
      }
    } catch (configEditErr) {
      console.warn("Config-driven edit failed, falling back to template matcher:", configEditErr.message);
    }
  }

  // ─── 2. Fallback to Legacy Template Matcher & Text Patches ───────────────
  try {
    const template = findTemplateFromPromptOrCode(originalPrompt, existingCode);
    if (template) {
      const editedTemplate = clone(template);
      await applyTheme(editedTemplate, instruction, changes);
      applyField(editedTemplate, instruction, changes);
      applyRemoveField(editedTemplate, instruction, changes);
      applyRenameField(editedTemplate, instruction, changes);
      applyRequiredOptional(editedTemplate, instruction, changes);
      applyAppText(editedTemplate, instruction, changes);
      applyLogo(editedTemplate, instruction, changes);
      applyLayout(editedTemplate, instruction, changes);

      if (changes.length > 0) {
        let code;
        if (isSupabase) {
          const supabaseResult = buildFlutterSupabaseCrudApp({
            template: sanitizeTemplateBeforeBuild(editedTemplate),
            supabaseUrl: effectiveUrl,
            supabaseAnonKey: effectiveKey,
            tableName: effectiveTable,
          });
          code = sanitizeGeneratedFlutterCode(supabaseResult.code);
          generatedTableSql = supabaseResult.tableSql;
          finalTableName = supabaseResult.tableName;
        } else {
          code = sanitizeGeneratedFlutterCode(
            buildFlutterCrudApp(sanitizeTemplateBeforeBuild(editedTemplate))
          );
        }

        const patched = await applyTextPatches(code, instruction);
        if (patched.handled) {
          code = patched.code;
          changes.push(...patched.changes);
        }
        return {
          handled: true,
          code: sanitizeGeneratedFlutterCode(code),
          source: isSupabase ? "local-template-supabase-edit" : "local-template-edit",
          changes,
          message: `Updated locally: ${changes.join(", ")}`,
          storageMode: isSupabase ? "supabase" : "local",
          tableSql: generatedTableSql,
          tableName: finalTableName,
        };
      }
    }
  } catch (error) {
    console.log("Local template edit failed, trying safe patch:", error.message);
  }

  const patched = await applyTextPatches(existingCode, instruction);
  if (patched.handled) {
    return {
      handled: true,
      code: sanitizeGeneratedFlutterCode(patched.code),
      source: "local-code-patch",
      changes: patched.changes,
      message: `Updated locally: ${patched.changes.join(", ")}`,
      storageMode: isSupabase ? "supabase" : "local",
      tableSql: generatedTableSql,
      tableName: finalTableName,
    };
  }

  return {
    handled: false,
    code: sanitizeGeneratedFlutterCode(existingCode),
    source: "not-handled",
    changes: [],
    message: "Local editor could not safely apply this change.",
    storageMode: isSupabase ? "supabase" : "local",
  };
}

module.exports = {
  applyLocalCodeEdit,
  applyExtendedLocalPatch,
  isSupabaseCode,
  extractSupabaseConfigFromCode,
  reconstructAppConfigFromCode,
};
