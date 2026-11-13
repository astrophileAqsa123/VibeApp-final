const { normalizeAppSpec, evaluateRequirementCoverage } = require("../appSpec");
const { ComponentRegistry, resolveComponents } = require("../components");
const { inferViews, auditCompilerSpec } = require("../appSpec/compilerCapabilities");

function identifier(value = "") {
  const words = String(value).replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "record";
  return words.map((word, index) => index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)).join("");
}

function singular(value = "") {
  const clean = identifier(value).toLowerCase();
  if (clean === "people") return "person";
  if (clean.endsWith("ies")) return `${clean.slice(0, -3)}y`;
  if (clean.endsWith("ses")) return clean.slice(0, -2);
  if (clean.endsWith("s") && !clean.endsWith("ss")) return clean.slice(0, -1);
  return clean;
}

function fieldType(id) {
  const value = id.toLowerCase();
  if (/date|deadline/.test(value)) return "date";
  if (/age|quantity|capacity|level|minimum|maximum|count|amount|price|budget|power|oxygen|number/.test(value)) return "number";
  if (/description|resolution|notes|details|address/.test(value)) return "textarea";
  if (/email/.test(value)) return "email";
  if (/phone|mobile/.test(value)) return "phone";
  return "text";
}

function parseEntities(prompt) {
  const match = String(prompt).match(/\bEntities\s*:\s*([\s\S]*?)(?=\bRelationships\s*:|\bRequirements\s*:|$)/i);
  if (!match) return [];
  const section = match[1].replace(/[,:;()]/g, " ");
  const starts = [...section.matchAll(/\b[A-Z][a-zA-Z0-9]*\b/g)];
  const entities = [];
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts[index + 1];
    const name = current[0];
    const fieldText = section.slice(current.index + name.length, next ? next.index : section.length);
    const fieldIds = fieldText.match(/\b[a-z][A-Za-z0-9]*\b/g) || [];
    const uniqueFields = [...new Set(fieldIds.filter((field) => !["and", "with", "fields", "item", "items"].includes(field.toLowerCase()) && field.toLowerCase() !== "id"))];
    entities.push({
      id: identifier(name),
      name,
      fields: uniqueFields.map((field, fieldIndex) => ({
        id: identifier(field),
        label: String(field).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase()),
        type: fieldType(field),
        required: fieldIndex === 0,
        searchable: fieldIndex < 3,
        filterable: /status|severity|condition|type|health/i.test(field),
      })),
    });
  }
  return entities;
}

function resolveEntityId(entities, value) {
  const wanted = singular(value);
  return entities.find((entity) => singular(entity.id) === wanted || singular(entity.name) === wanted)?.id || null;
}

function relationshipId(source, target, suffix = "") {
  return `${source}${target.charAt(0).toUpperCase()}${target.slice(1)}${suffix}`;
}

function addRelationship(list, relationship) {
  const duplicate = list.find((item) => item.type === relationship.type && ((item.sourceEntity === relationship.sourceEntity && item.targetEntity === relationship.targetEntity && (relationship.type === 'manyToMany' || item.targetField === relationship.targetField)) || (relationship.type === "manyToMany" && item.sourceEntity === relationship.targetEntity && item.targetEntity === relationship.sourceEntity)));
  if (!duplicate) list.push(relationship);
  else duplicate.required = duplicate.required || relationship.required;
}

function parentField(entities, targetId, sourceId) {
  const target = entities.find((entity) => entity.id === targetId);
  const sourceName = singular(sourceId);
  return target?.fields.find((field) => singular(field.id).includes(sourceName))?.id || `${sourceId}Id`;
}

function parseRelationships(prompt, entities) {
  const match = String(prompt).match(/\bRelationships\s*:\s*([\s\S]*?)(?=\bRequirements\s*:|$)/i);
  const section = match ? match[1] : String(prompt);
  const relationships = [];
  const oneToMany = /\b([A-Z][A-Za-z0-9]*)\s+(?:can\s+)?(?:contains|contain|stores|store|has)\s+(?:many|multiple)\s+([A-Z][A-Za-z0-9]*)/g;
  for (const item of section.matchAll(oneToMany)) {
    const source = resolveEntityId(entities, item[1]);
    const target = resolveEntityId(entities, item[2]);
    if (source && target && source !== target) addRelationship(relationships, { id: relationshipId(source, target), type: "oneToMany", sourceEntity: source, targetEntity: target, targetField: parentField(entities, target, source), required: false, onDelete: "restrict", sourceDisplay: { showRelatedRecords: true, sectionTitle: entities.find((entity) => entity.id === target)?.name || "Related records" } });
  }
  const manyToMany = /\b([A-Z][A-Za-z0-9]*)\s+(?:can\s+)?(?:participate\s+in|appear\s+in|requires?|consume|involve|have)\s+(?:in\s+)?(?:many|multiple)\s+([A-Z][A-Za-z0-9]*)/g;
  for (const item of section.matchAll(manyToMany)) {
    const source = resolveEntityId(entities, item[1]);
    const target = resolveEntityId(entities, item[2]);
    if (source && target && source !== target) {
      // An explicit many-to-many statement takes precedence over a preceding "has many".
      for (let i = relationships.length - 1; i >= 0; i--) {
        const r = relationships[i];
        if ([source, target].includes(r.sourceEntity) && [source, target].includes(r.targetEntity)) relationships.splice(i, 1);
      }
      addRelationship(relationships, { id: relationshipId(source, target), type: "manyToMany", sourceEntity: source, targetEntity: target, required: false, onDelete: "restrict", sourceDisplay: { showRelatedRecords: true, sectionTitle: "Related records" } });
    }
  }
  // Explicit foreign keys are structural evidence, not guessed prose relationships.
  for (const child of entities) for (const field of child.fields) {
    if (!/Id$/.test(field.id)) continue;
    const parent = resolveEntityId(entities, field.id.replace(/Id$/, "").replace(/^assigned/i, ""));
    if (!parent || parent === child.id) continue;
    addRelationship(relationships, { id: relationshipId(parent, child.id), type: "oneToMany", sourceEntity: parent, targetEntity: child.id, targetField: field.id, required: field.required, onDelete: "restrict" });
  }
  const belongs = /\b([A-Z][A-Za-z0-9]*)\s+belongs?\s+to\s+(?:a\s+|an\s+)?([A-Z][A-Za-z0-9]*)(?:\s+and\s+(?:a\s+)?([A-Z][A-Za-z0-9]*))?/g;
  for (const match of section.matchAll(belongs)) {
    const child = resolveEntityId(entities, match[1]);
    for (const name of [match[2], match[3]].filter(Boolean)) {
      const parent = resolveEntityId(entities, name);
      if (parent && child) addRelationship(relationships, { id: relationshipId(parent, child), type: "oneToMany", sourceEntity: parent, targetEntity: child, targetField: parentField(entities, child, parent), required: true, onDelete: "restrict" });
    }
  }
  if (/different roles|per[- ]project roles/i.test(section)) {
    const person = resolveEntityId(entities, "People"), project = resolveEntityId(entities, "Project");
    if (person && project) {
      const index = relationships.findIndex((r) => r.type === "manyToMany" && [person, project].includes(r.sourceEntity) && [person, project].includes(r.targetEntity));
      if (index >= 0) relationships.splice(index, 1);
      entities.push({ id: "projectMembership", name: "Project Membership", fields: [{ id: "role", label: "Role", type: "select", options: ["Cast", "Director", "Producer", "Camera", "Sound", "Editor"], required: true }] });
      for (const parent of [person, project]) relationships.push({ id: relationshipId(parent, "projectMembership"), type: "oneToMany", sourceEntity: parent, targetEntity: "projectMembership", targetField: `${parent}Id`, required: true, onDelete: "restrict" });
    }
  }
  return relationships;
}

function ensureMaintenanceEntity(prompt, entities, relationships) {
  if (!/\bmaintenance\s+records?\b/i.test(prompt)) return;
  const equipment = resolveEntityId(entities, "Equipment");
  if (!equipment) return;
  let maintenance = resolveEntityId(entities, "MaintenanceRecord");
  if (!maintenance) {
    maintenance = "maintenanceRecord";
    entities.push({ id: maintenance, name: "Maintenance Record", fields: [
      { id: "maintenanceDate", label: "Maintenance Date", type: "date", required: true, searchable: false },
      { id: "notes", label: "Notes", type: "textarea", required: false, searchable: true },
      { id: "technician", label: "Technician", type: "text", required: false, searchable: true },
    ] });
  }
  addRelationship(relationships, { id: "equipmentMaintenanceRecords", type: "oneToMany", sourceEntity: equipment, targetEntity: maintenance, targetField: "equipmentId", required: true, onDelete: "cascade", sourceDisplay: { showRelatedRecords: true, sectionTitle: "Maintenance Records" } });
}

function buildRequirements(spec) {
  const requirements = [];
  for (const entity of spec.entities) requirements.push({ id: `entity_${entity.id}`, text: `Full CRUD for ${entity.name}`, category: "entity", priority: "required", implementedBy: [`entity.${entity.id}`] });
  for (const relationship of spec.relationships) requirements.push({ id: `relationship_${relationship.id}`, text: `Manage ${relationship.id}`, category: "relationship", priority: "required", implementedBy: [`relationship.${relationship.id}`] });
  requirements.push(
    { id: "dashboard", text: "Dashboard statistics", category: "dashboard", priority: "required", implementedBy: ["screen.dashboard"] },
    { id: "search", text: "Search and filtering", category: "search", priority: "required", implementedBy: ["entity.search"] },
    { id: "deleteConfirmation", text: "Confirm deletion", category: "rule", priority: "required", implementedBy: ["rule.standard"] },
    { id: "localPersistence", text: "Local persistence", category: "storage", priority: "required", implementedBy: ["core.storage.local"] },
    { id: "seedData", text: "Realistic sample data", category: "seed", priority: "required", implementedBy: ["core.seed"] },
    { id: "uiStates", text: "Empty loading and error states", category: "screen", priority: "required", implementedBy: ["core.uiStates"] },
  );
  return requirements;
}

function auditExplicitRequest(prompt, spec) {
  const issues = [];
  const expected = parseEntities(prompt);
  if (expected.length < 2) return issues;
  const relationships = parseRelationships(prompt, expected);
  for (const entity of expected) {
    const actual = spec.entities.find((e) => singular(e.id) === singular(entity.id));
    if (!actual) { issues.push({ id: `missing_${entity.id}`, reason: `Requested entity ${entity.name} is missing.` }); continue; }
    for (const field of entity.fields) if (!actual.fields.some((f) => f.id === field.id)) issues.push({ id: `missing_${entity.id}_${field.id}`, reason: `Requested field ${entity.name}.${field.id} is missing.` });
  }
  for (const r of relationships) {
    if (!spec.relationships.some((candidate) => candidate.type === r.type && ((candidate.sourceEntity === r.sourceEntity && candidate.targetEntity === r.targetEntity) || (r.type === 'manyToMany' && candidate.sourceEntity === r.targetEntity && candidate.targetEntity === r.sourceEntity)))) issues.push({ id: `missing_${r.id}`, reason: `Requested relationship ${r.sourceEntity} → ${r.targetEntity} (${r.type}) is missing.` });
  }
  if (/calendar/i.test(prompt) && !spec.views.some(v => v.type === 'calendar')) issues.push({ id: 'missing_calendar', reason: 'Requested calendar has no implemented view.' });
  if (/budget\s*(?:vs\.?|versus)/i.test(prompt) && !spec.views.some(v => v.type === 'budget')) issues.push({ id: 'missing_budget', reason: 'Requested budget comparison has no implemented view.' });
  return issues;
}

function unsupportedFallbackRequirements(prompt) {
  const section = String(prompt).split(/Requirements\s*:/i)[1] || '';
  // Fallback is deliberately narrow. Unknown prose must go back to the AI planner,
  // not disappear from the coverage report.
  const supported = /^(?:full crud|one[- ]to[- ]many|many[- ]to[- ]many|relationship (?:management|selectors)|\w+ detail (?:page|screen) showing|production calendar|\w+ budget (?:vs|versus)|search|prevent deletion|referential integrity|dashboard|local (?:persistent )?(?:database|persistence|storage)|seed|sample data|responsive material|use material|material 3|generate complete|include empty|empty|validation for all forms|confirm(?:ation)?|deletion confirmation|loading and error states)/i;
  return section.split(/[.\n]/).map(s => s.trim()).filter(Boolean).filter(s => !supported.test(s)).map((text, i) => ({ id: `unverifiedRequirement${i}`, text, implementedBy: [] }));
}

function planStructuredPrompt(prompt, options = {}) {
  const entities = parseEntities(prompt);
  if (entities.length < 2) return null;
  const relationships = parseRelationships(prompt, entities);
  ensureMaintenanceEntity(prompt, entities, relationships);
  const appName = String(prompt).match(/called\s+[“\"]([^”\"]+)[”\"]/i)?.[1] || String(prompt).match(/called\s+([A-Z][A-Za-z0-9 ]+)/i)?.[1]?.trim() || "Generated Application";
  const requirements = buildRequirements({ entities, relationships });
  requirements.push(...unsupportedFallbackRequirements(prompt));
  if (/\b(login|signup|sign up|authentication|read.only|permissions)\b/i.test(prompt)) requirements.push({ id: 'unsupportedSecurity', text: 'Requested authentication or permissions require an implemented security component.', implementedBy: [] });
  const views = inferViews(prompt, entities, relationships);
  for (const view of views) requirements.push({ id: view.id, text: view.title, implementedBy: [`view.${view.id}`] });
  const normalized = normalizeAppSpec({
    app: { id: identifier(appName), name: appName, storageMode: /local\s+(?:persistent\s+)?(?:database|persistence|storage)/i.test(prompt) ? "local" : "memory" },
    entities,
    relationships,
    views,
    screens: [],
    requirements,
  });
  if (!normalized.valid) return null;
  const resolution = resolveComponents(normalized.spec, options.registry || new ComponentRegistry());
  normalized.spec.selectedCapabilities = resolution.components.map((component) => component.id);
  const coverage = evaluateRequirementCoverage(normalized.spec);
  normalized.warnings.push('AI planning was unavailable. Generic sample data was used; review domain-specific requirements before relying on this app.');
  const missingCapabilities = [...resolution.missingCapabilities, ...auditCompilerSpec(normalized.spec)];
  return { ready: coverage.complete && !missingCapabilities.length, spec: normalized.spec, requirements: coverage.requirements, assumptions: ["Used the explicit Entities and Relationships sections after AI planning was unavailable.", "Local storage uses an embedded Hive database; relationship integrity is enforced by the application."], componentPlan: resolution.components, missingCapabilities, coverage, warnings: normalized.warnings };
}

module.exports = { planStructuredPrompt, parseEntities, parseRelationships, auditExplicitRequest };
