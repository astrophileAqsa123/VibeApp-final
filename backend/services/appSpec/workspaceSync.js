// Role-based workspace apps keep a side table (spec.workspaceRoleConfig) that says
// which role may see/edit which module. It is keyed by entity id, so whenever an edit
// adds or removes a module this table has to be updated too - otherwise a new module is
// invisible to every role, or (worse) the compiled app references a module that no
// longer exists and crashes at start-up.

function roleTier(config, roleName) {
  const prefix = `${roleName}::`;
  const all = Object.entries(config.entityActions || {}).filter(([key]) => key.startsWith(prefix)).map(([, actions]) => actions || []);
  if (all.some((actions) => actions.includes("delete"))) return ["create", "read", "update", "delete"]; // admin-like
  if (all.some((actions) => actions.includes("create") || actions.includes("update"))) return ["create", "read", "update"]; // operator-like
  return null; // read-only roles do not get new modules automatically
}

/**
 * Bring `spec.workspaceRoleConfig` and `spec.permissions` back in line with `spec.entities`.
 * `previousSpec` (optional) lets us tell which entities are new and should be granted to roles.
 */
function reconcileWorkspaceSpec(spec, previousSpec = null) {
  const config = spec && spec.workspaceRoleConfig;
  if (!config || typeof config !== "object") return spec;
  const ids = new Set((spec.entities || []).map((entity) => entity.id));
  const previousIds = new Set((previousSpec?.entities || []).map((entity) => entity.id));

  config.entityAccess = config.entityAccess || {};
  config.entityActions = config.entityActions || {};
  config.primaryActions = config.primaryActions || {};

  for (const role of Object.keys(config.entityAccess)) {
    config.entityAccess[role] = (config.entityAccess[role] || []).filter((id) => ids.has(id));
  }
  for (const key of Object.keys(config.entityActions)) {
    if (!ids.has(key.split("::")[1])) delete config.entityActions[key];
  }
  for (const action of Object.values(config.primaryActions)) {
    if (action && action.entityId && !ids.has(action.entityId)) action.entityId = null;
  }

  const roles = Object.keys(config.entityAccess);
  const newIds = [...ids].filter((id) => previousSpec && !previousIds.has(id));
  for (const id of newIds) {
    let granted = false;
    for (const role of roles) {
      const actions = roleTier(config, role);
      if (!actions) continue;
      if (!config.entityAccess[role].includes(id)) config.entityAccess[role].push(id);
      config.entityActions[`${role}::${id}`] = actions;
      granted = true;
    }
    if (!granted && roles.length) {
      // No role qualifies automatically; never leave a module nobody can open.
      config.entityAccess[roles[0]].push(id);
      config.entityActions[`${roles[0]}::${id}`] = ["create", "read", "update", "delete"];
    }
  }

  // Declarative permissions mirror the UI-visible resources.
  if (Array.isArray(spec.roles) && spec.roles.length) {
    spec.permissions = [];
    for (const role of spec.roles) {
      for (const id of config.entityAccess[role.name] || []) {
        spec.permissions.push({ roleId: role.id, resource: id, actions: config.entityActions[`${role.name}::${id}`] || ["read"] });
      }
    }
  }
  return spec;
}

module.exports = { reconcileWorkspaceSpec };
