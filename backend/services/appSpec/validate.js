const {
  VALID_RELATIONSHIP_TYPES,
  VALID_DELETE_POLICIES,
  VALID_ACTIONS,
  VALID_SCREEN_TYPES,
} = require("./constants");

function duplicateIds(items = []) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item?.id)) duplicates.add(item?.id);
    seen.add(item?.id);
  }
  return [...duplicates].filter(Boolean);
}

function validateAppSpec(spec = {}) {
  const errors = [];
  const warnings = [];
  const entities = Array.isArray(spec.entities) ? spec.entities : [];
  const screens = Array.isArray(spec.screens) ? spec.screens : [];
  const roles = Array.isArray(spec.roles) ? spec.roles : [];
  const relationships = Array.isArray(spec.relationships) ? spec.relationships : [];
  const entityIds = new Set(entities.map((entity) => entity.id));
  const screenIds = new Set(screens.map((screen) => screen.id));
  const roleIds = new Set(roles.map((role) => role.id));

  if (!spec.app?.name) errors.push("App name is required.");
  if (!entities.length) errors.push("At least one entity is required.");
  for (const id of duplicateIds(entities)) errors.push(`Duplicate entity id: ${id}.`);
  for (const id of duplicateIds(screens)) errors.push(`Duplicate screen id: ${id}.`);
  for (const id of duplicateIds(roles)) errors.push(`Duplicate role id: ${id}.`);
  for (const id of duplicateIds(relationships)) errors.push(`Duplicate relationship id: ${id}.`);

  for (const entity of entities) {
    const fields = Array.isArray(entity.fields) ? entity.fields : [];
    if (!fields.length) errors.push(`Entity ${entity.id} has no fields.`);
    for (const id of duplicateIds(fields)) errors.push(`Entity ${entity.id} has duplicate field id: ${id}.`);
    const fieldIds = new Set(fields.map((field) => field.id));
    if (!fieldIds.has(entity.displayField)) errors.push(`Entity ${entity.id} displayField does not exist: ${entity.displayField}.`);
    for (const fieldId of entity.searchFields || []) {
      if (!fieldIds.has(fieldId)) errors.push(`Entity ${entity.id} search field does not exist: ${fieldId}.`);
    }
    for (const field of fields.filter((f) => f.type === 'reference')) {
      if (!entityIds.has(field.referenceEntity)) errors.push(`Reference ${entity.id}.${field.id} points to a missing entity.`);
      if (!relationships.some((r) => r.targetEntity === entity.id && r.targetField === field.id && r.sourceEntity === field.referenceEntity)) errors.push(`Reference ${entity.id}.${field.id} needs an explicit relationship with a delete policy.`);
    }
  }

  for (const relationship of relationships) {
    if (!VALID_RELATIONSHIP_TYPES.has(relationship.type)) errors.push(`Relationship ${relationship.id} has invalid type: ${relationship.type}.`);
    if (!entityIds.has(relationship.sourceEntity)) errors.push(`Relationship ${relationship.id} source entity does not exist: ${relationship.sourceEntity}.`);
    if (!entityIds.has(relationship.targetEntity)) errors.push(`Relationship ${relationship.id} target entity does not exist: ${relationship.targetEntity}.`);
    if (!VALID_DELETE_POLICIES.has(relationship.onDelete)) errors.push(`Relationship ${relationship.id} has invalid delete policy: ${relationship.onDelete}.`);
    if (relationship.required && relationship.onDelete === "detach") {
      errors.push(`Relationship ${relationship.id} is required and cannot use detach deletion.`);
    }
    if (["oneToOne", "oneToMany"].includes(relationship.type) && !relationship.targetField) {
      errors.push(`Relationship ${relationship.id} requires a targetField.`);
    }
    if (["oneToOne", "oneToMany"].includes(relationship.type) && entityIds.has(relationship.targetEntity)) {
      const target = entities.find((entity) => entity.id === relationship.targetEntity);
      if (!target.fields.some((field) => field.id === relationship.targetField)) {
        errors.push(`Relationship ${relationship.id} target field does not exist: ${relationship.targetEntity}.${relationship.targetField}.`);
      }
    }
  }

  for (const screen of screens) {
    if (!VALID_SCREEN_TYPES.has(screen.type)) errors.push(`Screen ${screen.id} has invalid type: ${screen.type}.`);
    if (screen.entityId && !entityIds.has(screen.entityId)) errors.push(`Screen ${screen.id} references missing entity: ${screen.entityId}.`);
  }
  for (const item of spec.navigation?.items || []) {
    if (!screenIds.has(item.screenId)) errors.push(`Navigation item ${item.id} references missing screen: ${item.screenId}.`);
  }
  for (const role of roles) {
    if (role.selfSignup && /admin|owner|super/i.test(role.name || role.id || "")) {
      warnings.push(`Role ${role.name || role.id} is admin-like and should not normally allow public self-signup.`);
    }
    for (const screenId of role.allowedScreens || []) {
      if (!screenIds.has(screenId)) warnings.push(`Role ${role.id} references unknown allowed screen: ${screenId}.`);
    }
  }
  for (const dashboard of spec.dashboards || []) {
    if (dashboard.roleId && !roleIds.has(dashboard.roleId)) errors.push(`Dashboard ${dashboard.id || "dashboard"} references missing role: ${dashboard.roleId}.`);
  }

  for (const permission of spec.permissions || []) {
    if (!roleIds.has(permission.roleId)) errors.push(`Permission references missing role: ${permission.roleId}.`);
    if (permission.resource !== "*" && !entityIds.has(permission.resource)) errors.push(`Permission references missing resource: ${permission.resource}.`);
    for (const action of permission.actions || []) {
      if (!VALID_ACTIONS.has(action)) errors.push(`Permission contains invalid action: ${action}.`);
    }
  }
  if (spec.authentication?.enabled && !roles.length) warnings.push("Authentication is enabled without explicit roles; the normalizer should add a User role.");

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateAppSpec };
