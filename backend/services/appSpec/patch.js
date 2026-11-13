const { clone, toIdentifier } = require("./utils");

function requireItem(items, id, type) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${type} not found: ${id}`);
  return item;
}

function applySpecPatch(spec, patch = {}) {
  const next = clone(spec);
  const changedPaths = new Set();
  for (const operation of patch.operations || []) {
    const op = operation?.op;
    if (op === "setAppName") {
      next.app.name = String(operation.value || "").trim();
      next.appName = next.app.name;
      changedPaths.add("app.name");
    } else if (op === "setTheme") {
      next.theme = { ...next.theme, ...(operation.value || {}) };
      changedPaths.add("theme");
    } else if (op === "setSplash") {
      next.splash = { ...next.splash, ...(operation.value || {}) };
      changedPaths.add("splash");
    } else if (op === "removeSplash") {
      next.splash.enabled = false;
      changedPaths.add("splash.enabled");
    } else if (op === "addEntity") {
      const entity = clone(operation.entity);
      entity.id = toIdentifier(entity.id || entity.name, "record");
      if (next.entities.some((item) => item.id === entity.id)) throw new Error(`Entity already exists: ${entity.id}`);
      next.entities.push(entity);
      changedPaths.add(`entities.${entity.id}`);
    } else if (op === "removeEntity") {
      const entityId = toIdentifier(operation.entityId, "record");
      next.entities = next.entities.filter((item) => item.id !== entityId);
      next.relationships = next.relationships.filter((item) => item.sourceEntity !== entityId && item.targetEntity !== entityId);
      next.screens = next.screens.filter((item) => item.entityId !== entityId);
      next.permissions = next.permissions.filter((item) => item.resource !== entityId);
      changedPaths.add(`entities.${entityId}`);
    } else if (op === "addField") {
      const entity = requireItem(next.entities, operation.entityId, "Entity");
      const field = clone(operation.field);
      field.id = toIdentifier(field.id || field.name || field.label, "field");
      if (entity.fields.some((item) => item.id === field.id)) throw new Error(`Field already exists: ${operation.entityId}.${field.id}`);
      entity.fields.push(field);
      changedPaths.add(`entities.${entity.id}.fields.${field.id}`);
    } else if (op === "updateField") {
      const entity = requireItem(next.entities, operation.entityId, "Entity");
      const field = requireItem(entity.fields, operation.fieldId, "Field");
      if (operation.changes?.id && operation.changes.id !== field.id) throw new Error("Field IDs are stable; change the label instead.");
      Object.assign(field, clone(operation.changes));
      changedPaths.add(`entities.${entity.id}.fields.${field.id}`);
    } else if (op === "removeField") {
      const entity = requireItem(next.entities, operation.entityId, "Entity");
      entity.fields = entity.fields.filter((field) => field.id !== operation.fieldId);
      entity.searchFields = (entity.searchFields || []).filter((id) => id !== operation.fieldId);
      changedPaths.add(`entities.${entity.id}.fields.${operation.fieldId}`);
    } else if (op === "addRelationship") {
      const relationship = clone(operation.relationship);
      relationship.id = toIdentifier(relationship.id || `${relationship.sourceEntity}_${relationship.targetEntity}`, "relationship");
      if (next.relationships.some((item) => item.id === relationship.id)) throw new Error(`Relationship already exists: ${relationship.id}`);
      next.relationships.push(relationship);
      changedPaths.add(`relationships.${relationship.id}`);
    } else if (op === "updateRelationship") {
      const relationship = requireItem(next.relationships, operation.relationshipId, "Relationship");
      if (operation.changes?.id && operation.changes.id !== relationship.id) throw new Error("Relationship IDs are stable.");
      Object.assign(relationship, clone(operation.changes));
      changedPaths.add(`relationships.${relationship.id}`);
    } else if (op === "removeRelationship") {
      next.relationships = next.relationships.filter((item) => item.id !== operation.relationshipId);
      changedPaths.add(`relationships.${operation.relationshipId}`);
    } else if (op === "addScreen") {
      const screen = clone(operation.screen);
      screen.id = toIdentifier(screen.id || screen.title, "screen");
      if (next.screens.some((item) => item.id === screen.id)) throw new Error(`Screen already exists: ${screen.id}`);
      next.screens.push(screen);
      changedPaths.add(`screens.${screen.id}`);
    } else if (op === "removeScreen") {
      next.screens = next.screens.filter((item) => item.id !== operation.screenId);
      next.navigation.items = next.navigation.items.filter((item) => item.screenId !== operation.screenId);
      changedPaths.add(`screens.${operation.screenId}`);
    } else if (op === "upsertView") {
      const view = clone(operation.view);
      if (!view?.id) throw new Error("View ID is required.");
      next.views = [...(next.views || []).filter((v) => v.id !== view.id), view];
      changedPaths.add(`views.${view.id}`);
    } else if (op === "removeView") {
      next.views = (next.views || []).filter((v) => v.id !== operation.viewId);
      changedPaths.add(`views.${operation.viewId}`);
    } else if (op === "setPermission") {
      next.permissions = next.permissions.filter((item) => !(item.roleId === operation.roleId && item.resource === operation.resource));
      next.permissions.push({ roleId: operation.roleId, resource: operation.resource, actions: clone(operation.actions || []) });
      changedPaths.add(`permissions.${operation.roleId}.${operation.resource}`);
    } else if (op === "reorderNavigation") {
      const order = operation.screenIds || [];
      const byScreen = new Map(next.navigation.items.map((item) => [item.screenId, item]));
      next.navigation.items = order.map((id) => byScreen.get(id)).filter(Boolean);
      changedPaths.add("navigation.items");
    } else {
      throw new Error(`Unsupported AppSpec patch operation: ${op}`);
    }
  }
  return { spec: next, changedPaths: [...changedPaths] };
}

module.exports = { applySpecPatch };
