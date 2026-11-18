// Temporary compatibility adapter for routes that still expect the legacy
const { buildArchitectBlueprint } = require('../ai/appArchitectAgent');
// template API. It creates one configuration from the current request; it does
// not load or match the removed domain-template library.
const { buildFlutterCrudApp } = require("./uniqueFlutterCrudFactory");
const { toIdentifier } = require("../appSpec");
const { inferUiPresetFromPrompt } = require("../uiPresets");
const { resolveDomainProfile, bindProfileToFields } = require("./domainProfiles");

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
  const baseProfile = resolveDomainProfile(prompt);
  const explicitFields = extractExplicitFields(prompt);
  const profile = bindProfileToFields(baseProfile, explicitFields.length ? explicitFields : baseProfile.fields, { explicit: explicitFields.length > 0 });
  config.appName = profile.appName;
  config.entity = profile.entity;
  config.entityPlural = profile.plural;
  config.domain = profile.domain;
  config.logo = profile.logo;
  config.appType = toIdentifier(config.appName, "records");
  config.emptyState = `No ${profile.plural.toLowerCase()} added yet`;
  config.cta = `Add ${profile.entity}`;
  config.fields = profile.fields;
  config.profileKey = profile.key;
  // Shell modules and the record fields they read from (charts, calendar, ...).
  config.shell = {
    modules: profile.modules,
    statusField: profile.statusField,
    categoryField: profile.categoryField,
    dateField: profile.dateField,
    amountField: profile.amountField,
    highlights: profile.highlights || [],
    icon: profile.icon || "folder_copy",
  };
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
