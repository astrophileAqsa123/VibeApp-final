const { STANDARD_RULE_TYPES } = require("./definitions/builtin");
const { ComponentRegistry } = require("./registry");

function requiredComponentIds(spec) {
  const storageComponent = spec.app?.storageMode === "local" ? "core.storage.local" : "core.storage.memory";
  const ids = new Set(["core.app", "core.theme", "core.validation", storageComponent, "core.seed", "core.uiStates", "navigation.responsive", "screen.dashboard", "rule.standard"]);
  if (spec.authentication?.enabled) ids.add("auth.basic");
  if (spec.authentication?.verification?.enabled) ids.add("auth.verification");
  if ((spec.roles || []).length || (spec.permissions || []).length) ids.add("security.rbac");
  if (spec.splash?.enabled) ids.add("app.splash");
  if ((spec.screens || []).some((screen) => screen.type === "dashboard")) ids.add("screen.dashboard");
  if ((spec.screens || []).some((screen) => screen.type === "profile")) ids.add("screen.profile");
  if ((spec.screens || []).some((screen) => screen.type === "settings")) ids.add("screen.settings");
  if ((spec.entities || []).length) ids.add("entity.crud");
  if ((spec.entities || []).some((entity) => (entity.searchFields || []).length || entity.fields.some((field) => field.filterable || field.sortable))) ids.add("entity.search");
  for (const relationship of spec.relationships || []) ids.add(`relationship.${relationship.type}`);
  if ((spec.rules || []).length) ids.add("rule.standard");
  if ((spec.workflows || []).length) ids.add("workflow.standard");
  if ((spec.customCapabilities || []).length) ids.add("extension.custom");
  return ids;
}

function topologicalSort(ids, registry) {
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Circular component dependency at ${id}`);
    visiting.add(id);
    const component = registry.require(id);
    for (const dependency of component.dependencies) visit(dependency);
    visiting.delete(id);
    visited.add(id);
    ordered.push(component);
  }
  for (const id of ids) visit(id);
  return ordered;
}

function resolveComponents(spec, registry = new ComponentRegistry()) {
  const missingCapabilities = [];
  for (const rule of spec.rules || []) {
    const inferredType = rule.type || (/confirm.*(delete|action)/i.test(`${rule.id || ""} ${rule.description || ""}`) ? "confirmAction" : "");
    if (!STANDARD_RULE_TYPES.has(inferredType)) {
      missingCapabilities.push({ id: rule.id || `customRule${missingCapabilities.length + 1}`, type: "businessRule", reason: `No standard rule component handles ${rule.type}.`, requirementIds: rule.requirementIds || [] });
    }
  }
  for (const screen of spec.screens || []) {
    if (screen.type === "custom" && !screen.customCapabilityId) {
      missingCapabilities.push({ id: `screen_${screen.id}`, type: "customScreen", reason: `Screen ${screen.id} requires a custom implementation.`, requirementIds: screen.requirementIds || [] });
    }
  }
  const ids = requiredComponentIds(spec);
  if (missingCapabilities.length) ids.add("extension.custom");
  const components = topologicalSort(ids, registry);
  return {
    valid: true,
    components: components.map((component) => ({ id: component.id, version: component.version, dependencies: component.dependencies, produces: component.produces })),
    missingCapabilities,
  };
}

module.exports = { resolveComponents, requiredComponentIds, topologicalSort };
