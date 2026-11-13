// Temporary compatibility adapter for routes that still expect the legacy
const { buildArchitectBlueprint } = require('../ai/appArchitectAgent');
// template API. It creates one configuration from the current request; it does
// not load or match the removed domain-template library.
const { buildFlutterCrudApp } = require("./uniqueFlutterCrudFactory");
const { toIdentifier } = require("../appSpec");
const { inferUiPresetFromPrompt } = require("../uiPresets");

const GENERIC_TEMPLATE = Object.freeze({
  id: "component-crud-base",
  appType: "component_crud",
  appName: "Records",
  entity: "Record",
  domain: "business",
  layout: "card_stack",
  uiVariant: 20,
  uiPreset: "modern",
  logo: "📋",
  theme: {
    primary: "#2563EB",
    secondary: "#38BDF8",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#172033",
    accent: "#10B981",
  },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: false },
    { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Pending", "Completed"] },
  ],
  initialData: [],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveNames(prompt = "") {
  let concept = String(prompt)
    .replace(/\b(build|create|make|generate|develop|a|an|the|flutter|crud|app|application|system|with|for|please|simple|basic)\b/gi, " ")
    .replace(/\b(in|using)\s+(blue|red|green|purple|black|white|dark|light)(?:\s+(?:and\s+)?\w+)?(?:\s+theme)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  concept = concept.split(/\b(?:where|that|which|users? can|fields?)\b/i)[0].trim();
  if (!concept) concept = "Records";
  const appName = titleCase(concept).slice(0, 60);
  const entityName = titleCase(concept
    .replace(/\b(management|manager|tracking|tracker|booking|portal|dashboard)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || "Record").slice(0, 45);
  return { appName: /\b(management|manager|tracker|portal)\b/i.test(appName) ? appName : `${appName} Manager`, entity: entityName };
}

function extractExplicitFields(prompt = "") {
  const match = String(prompt).match(/\b(?:with fields?|fields?(?: should be| are)?|include fields?)\s*[:\-]?\s*([^.;]+)/i);
  if (!match) return [];
  return match[1]
    .split(/,|\band\b/i)
    .map((value) => value.trim().replace(/\bfields?\b/gi, "").trim())
    .filter((value) => value.length > 1 && value.length < 50)
    .slice(0, 20)
    .map((label, index) => {
      const lower = label.toLowerCase();
      const type = /email/.test(lower) ? "email"
        : /phone|mobile/.test(lower) ? "phone"
        : /date|birthday|deadline|due/.test(lower) ? "date"
        : /price|amount|cost|total|stock|quantity|age|number/.test(lower) ? "number"
        : /description|notes?|address/.test(lower) ? "textarea"
        : "text";
      return { name: toIdentifier(label, `field${index + 1}`), label: titleCase(label), type, required: index === 0 };
    });
}

function inferFallbackFields(prompt = "", entity = "Record") {
  const text = String(prompt).toLowerCase();
  if (/\b(trip|travel|tour|itinerary)\b/.test(text)) {
    return [
      { name: "tripName", label: "Trip Name", type: "text", required: true },
      { name: "destination", label: "Destination", type: "text", required: true },
      { name: "startDate", label: "Start Date", type: "date", required: true },
      { name: "endDate", label: "End Date", type: "date", required: true },
      { name: "budget", label: "Budget", type: "number", required: false },
      { name: "travelers", label: "Travelers", type: "number", required: false },
      { name: "tripStatus", label: "Trip Status", type: "select", required: true, options: ["Planned", "Confirmed", "In Progress", "Completed", "Cancelled"] },
    ];
  }
  const label = titleCase(entity || "Record");
  return [
    { name: toIdentifier(`${label} Name`, "name"), label: `${label} Name`, type: "text", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: ["Active", "Pending", "Completed"] },
    { name: "date", label: "Date", type: "date", required: false },
    { name: "notes", label: "Notes", type: "textarea", required: false },
  ];
}

function applyPromptAppearance(config, prompt = "") {
  const text = String(prompt).toLowerCase();
  const colors = {
    blue: "#2563EB", red: "#EF4444", green: "#10B981", purple: "#8B5CF6",
    orange: "#F97316", pink: "#EC4899", teal: "#14B8A6", gold: "#D4A017",
  };
  for (const [name, value] of Object.entries(colors)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) config.theme.primary = value;
  }
  if (/\b(dark|black)\b/.test(text)) {
    config.theme.background = "#020617";
    config.theme.surface = "#0F172A";
    config.theme.text = "#FFFFFF";
  }
  if (/\b(grid|catalog|gallery)\b/.test(text)) config.layout = "catalog_grid";
  if (/\b(table|ledger|spreadsheet)\b/.test(text)) config.layout = "ledger_table";
  if (/\b(kanban|board)\b/.test(text)) config.layout = "kanban_board";
  config.uiPreset = inferUiPresetFromPrompt(prompt, config.uiPreset || "modern");
}

function buildCompatibilityConfig(prompt = "") {
  const config = clone(GENERIC_TEMPLATE);
  const names = deriveNames(prompt);
  config.appName = names.appName;
  config.entity = names.entity;
  config.appType = toIdentifier(config.appName, "records");
  config.emptyState = `No ${config.entity.toLowerCase()} records yet`;
  config.cta = `Add ${config.entity}`;
  const fields = extractExplicitFields(prompt);
  config.fields = fields.length ? fields : inferFallbackFields(prompt, config.entity);
  applyPromptAppearance(config, prompt);

  if (/\b(login|log in|sign in|signin|signup|sign up|register|role[- ]based|permissions?|user roles?)\b/i.test(prompt)) {
    const knownRoles = ["Administrator", "Admin", "Owner", "Manager", "Staff", "Employee", "Editor", "Viewer", "Customer", "Doctor", "Receptionist", "Teacher", "Student", "Patient"];
    const roles = knownRoles.filter((role) => new RegExp(`\\b${role.toLowerCase()}\\b`, "i").test(prompt));
    const architectRoles = buildArchitectBlueprint(prompt).roles.map((role) => role.label).filter(Boolean);
    config.features = {
      ...(config.features || {}),
      hasAuth: true,
      allowSignup: !/\blogin only\b/i.test(prompt),
      roles: architectRoles.length ? architectRoles.slice(0, 10) : roles.length ? roles.slice(0, 10) : ["User", "Admin"],
      hasDashboard: true,
      hasProfile: true,
      hasSettings: true,
      navigation: "bottom",
    };
  }

  return config;
}

function isCustomUtility(prompt = "") {
  return /\b(calculator|stopwatch|tic tac toe|game|timer|converter|drawing canvas|soundboard)\b/i.test(prompt);
}

function findBestTemplate(prompt = "") {
  if (!String(prompt).trim()) return { matched: false, reason: "Prompt is required." };
  if (isCustomUtility(prompt)) return { matched: false, routeHint: "custom_ai", reason: "This is a custom interactive application." };
  return { matched: true, template: buildCompatibilityConfig(prompt), score: 100, matchedVia: "component-compatibility" };
}

function generateExact500CrudTemplate(prompt = "") {
  const match = findBestTemplate(prompt);
  if (!match.matched) return { success: false, shouldFallback: true, reason: match.reason, meta: { totalTemplates: 0 } };
  const code = buildFlutterCrudApp(match.template);
  return {
    success: true,
    source: "component-compatibility-renderer",
    code,
    meta: { ...match.template, totalTemplates: 0, rawTemplate: match.template },
  };
}

module.exports = {
  findBestTemplate,
  generateExact500CrudTemplate,
  buildCompatibilityConfig,
};
