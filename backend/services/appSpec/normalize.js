const {
  APP_SPEC_VERSION,
  MAX_ENTITIES,
  MAX_FIELDS_PER_ENTITY,
  VALID_FIELD_TYPES,
  VALID_RELATIONSHIP_TYPES,
  VALID_DELETE_POLICIES,
  VALID_ACTIONS,
  VALID_SCREEN_TYPES,
} = require("./constants");
const {
  clone,
  toIdentifier,
  titleCase,
  pluralize,
  uniqueStrings,
  normalizeHex,
  contrastRatio,
} = require("./utils");

function normalizeField(rawField, index, usedIds, warnings) {
  if (!rawField || typeof rawField !== "object") return null;
  const label = String(rawField.label || rawField.name || rawField.id || `Field ${index + 1}`)
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .slice(0, 60);
  let id = toIdentifier(rawField.id || rawField.name || label, `field${index + 1}`);
  if (usedIds.has(id)) {
    let suffix = 2;
    while (usedIds.has(`${id}${suffix}`)) suffix += 1;
    warnings.push(`Renamed duplicate field "${label}" to "${id}${suffix}".`);
    id = `${id}${suffix}`;
  }
  usedIds.add(id);

  let type = String(rawField.type || "text").trim().toLowerCase();
  const aliases = { multiline: "textarea", bool: "boolean", dropdown: "select", multiselect: "multiselect", decimal: "number", currency: "number" };
  type = aliases[type] || type;
  if (!VALID_FIELD_TYPES.has(type)) {
    warnings.push(`Changed unsupported field type "${type}" to "text".`);
    type = "text";
  }

  const options = uniqueStrings(rawField.options || [], 40);
  if (["select", "multiselect", "status"].includes(type) && options.length < 2) {
    warnings.push(`Changed field "${label}" to text because it has fewer than two options.`);
    type = "text";
  }

  return {
    id,
    name: id,
    label: label || titleCase(id),
    type,
    required: Boolean(rawField.required ?? index === 0),
    unique: Boolean(rawField.unique),
    searchable: Boolean(rawField.searchable ?? type === "text"),
    filterable: Boolean(rawField.filterable ?? ["select", "status", "boolean"].includes(type)),
    sortable: Boolean(rawField.sortable ?? !["textarea", "multiselect"].includes(type)),
    listVisible: rawField.listVisible !== false,
    detailsVisible: rawField.detailsVisible !== false,
    readOnly: Boolean(rawField.readOnly || type === "computed"),
    ...(rawField.referenceEntity ? { referenceEntity: toIdentifier(rawField.referenceEntity) } : {}),
    ...(options.length ? { options } : {}),
    ...(rawField.defaultValue !== undefined ? { defaultValue: rawField.defaultValue } : {}),
    ...(rawField.validation && typeof rawField.validation === "object" ? { validation: clone(rawField.validation) } : {}),
  };
}

function normalizeEntity(rawEntity, index, warnings) {
  const name = String(rawEntity?.name || rawEntity?.entity || rawEntity?.label || `Record ${index + 1}`).trim().slice(0, 60);
  const id = toIdentifier(rawEntity?.id || name, `entity${index + 1}`);
  const usedFields = new Set();
  const sourceFields = Array.isArray(rawEntity?.fields) ? rawEntity.fields : [];
  const fields = sourceFields
    .filter((field) => String(field?.id || field?.name || '').toLowerCase() !== 'id')
    .slice(0, MAX_FIELDS_PER_ENTITY)
    .map((field, fieldIndex) => normalizeField(field, fieldIndex, usedFields, warnings))
    .filter(Boolean);
  if (!fields.length) {
    fields.push(normalizeField({ id: "title", label: "Title", required: true, searchable: true }, 0, usedFields, warnings));
    warnings.push(`Added a Title field to ${name} because it had no valid fields.`);
  }
  const displayField = usedFields.has(rawEntity?.displayField) ? rawEntity.displayField : (fields.find((field) => /^(name|title)$/i.test(field.id)) || fields.find((field) => !/Id$/.test(field.id)) || fields[0]).id;
  const requestedSearch = uniqueStrings(rawEntity?.searchFields || [], 20).filter((fieldId) => usedFields.has(fieldId));

  return {
    id,
    name,
    pluralName: String(rawEntity?.pluralName || pluralize(name)).trim().slice(0, 70),
    icon: String(rawEntity?.icon || "description").trim(),
    operations: {
      create: rawEntity?.operations?.create !== false,
      read: rawEntity?.operations?.read !== false,
      update: rawEntity?.operations?.update !== false,
      delete: rawEntity?.operations?.delete !== false,
    },
    fields,
    displayField,
    searchFields: requestedSearch.length ? requestedSearch : fields.filter((field) => field.searchable).map((field) => field.id),
  };
}

function normalizeTheme(rawTheme, warnings) {
  const theme = rawTheme && typeof rawTheme === "object" ? rawTheme : {};
  const background = normalizeHex(theme.background, "#F8FAFC");
  const surface = normalizeHex(theme.surface, "#FFFFFF");
  let text = normalizeHex(theme.text, "#172033");
  if (contrastRatio(background, text) < 4.5 || contrastRatio(surface, text) < 4.5) {
    const blackScore = Math.min(contrastRatio(background, "#111827"), contrastRatio(surface, "#111827"));
    const whiteScore = Math.min(contrastRatio(background, "#FFFFFF"), contrastRatio(surface, "#FFFFFF"));
    text = whiteScore >= blackScore ? "#FFFFFF" : "#111827";
    warnings.push("Adjusted theme text color to meet readable contrast.");
  }
  return {
    mode: ["light", "dark", "system"].includes(theme.mode) ? theme.mode : "light",
    primary: normalizeHex(theme.primary, "#2563EB"),
    secondary: normalizeHex(theme.secondary, "#38BDF8"),
    accent: normalizeHex(theme.accent, "#10B981"),
    background,
    surface,
    text,
    fontFamily: String(theme.fontFamily || "system").trim().slice(0, 60),
    borderRadius: Math.min(32, Math.max(0, Number(theme.borderRadius ?? 14) || 14)),
    density: ["compact", "comfortable", "spacious"].includes(theme.density) ? theme.density : "comfortable",
  };
}

function normalizeAuthentication(rawSpec, roleNames) {
  const legacyFeatures = rawSpec.features && typeof rawSpec.features === "object" ? rawSpec.features : {};
  const raw = rawSpec.authentication || rawSpec.auth || {};
  const enabled = Boolean(raw.enabled || legacyFeatures.hasAuth || legacyFeatures.roleBasedAuth || (Array.isArray(roleNames) && roleNames.length > 0));
  const defaultFields = [
    { id: "username", label: "Username", type: "text", required: true },
    { id: "password", label: "Password", type: "password", required: true },
  ];
  const normalizeAuthFields = (fields) => {
    const used = new Set();
    const warnings = [];
    return (Array.isArray(fields) && fields.length ? fields : defaultFields)
      .map((field, index) => normalizeField(field, index, used, warnings))
      .filter(Boolean);
  };
  return {
    enabled,
    allowSignup: enabled ? raw.allowSignup !== false : false,
    loginFields: enabled ? normalizeAuthFields(raw.loginFields) : [],
    signupFields: enabled ? normalizeAuthFields(raw.signupFields) : [],
    forgotPassword: enabled ? raw.forgotPassword !== false : false,
    verification: {
      enabled: enabled && Boolean(raw.verification?.enabled),
      method: ["emailOtp", "smsOtp", "link", "code", "manualApproval"].includes(raw.verification?.method)
        ? raw.verification.method
        : null,
    },
    roleIds: enabled ? roleNames.map((role) => role.id) : [],
  };
}

function defaultScreens(entities, authentication, splash) {
  const screens = [];
  if (authentication.enabled) {
    screens.push({ id: "login", type: "login", title: "Sign in" });
    if (authentication.allowSignup) screens.push({ id: "signup", type: "signup", title: "Create account" });
    if (authentication.verification.enabled) screens.push({ id: "verification", type: "verification", title: "Verify account" });
  }
  if (splash.enabled) screens.push({ id: "splash", type: "splash", title: splash.title });
  screens.push({ id: "dashboard", type: "dashboard", title: "Dashboard" });
  for (const entity of entities) {
    screens.push({ id: `${entity.id}List`, type: "entityList", title: entity.pluralName, entityId: entity.id, layout: "cards" });
    screens.push({ id: `${entity.id}Details`, type: "entityDetails", title: entity.name, entityId: entity.id, sections: [] });
    screens.push({ id: `${entity.id}Form`, type: "entityForm", title: entity.name, entityId: entity.id });
  }
  screens.push({ id: "profile", type: "profile", title: "Profile" });
  screens.push({ id: "settings", type: "settings", title: "Settings" });
  return screens;
}

function normalizeAppSpec(rawInput, options = {}) {
  const rawSpec = clone(rawInput);
  const errors = [];
  const warnings = [];
  const appName = String(rawSpec.app?.name || rawSpec.appName || rawSpec.title || "Generated App").trim().slice(0, 80);
  const storageMode = options.storageMode || rawSpec.app?.storageMode || rawSpec.storageMode || "memory";
  if (!["memory", "local", "supabase"].includes(storageMode)) errors.push(`Unsupported storage mode: ${storageMode}`);

  const legacyEntity = rawSpec.entity || "Record";
  const sourceEntities = Array.isArray(rawSpec.entities) && rawSpec.entities.length
    ? rawSpec.entities
    : [{ id: toIdentifier(legacyEntity, "record"), name: legacyEntity, fields: rawSpec.fields || [] }];
  const entities = sourceEntities.slice(0, MAX_ENTITIES).map((entity, index) => normalizeEntity(entity, index, warnings));
  const entityIds = new Set();
  for (const entity of entities) {
    if (entityIds.has(entity.id)) errors.push(`Duplicate entity id: ${entity.id}`);
    entityIds.add(entity.id);
  }
  if (sourceEntities.length > MAX_ENTITIES) warnings.push(`Limited entities to ${MAX_ENTITIES}.`);

  const requestedRoles = rawSpec.roles || rawSpec.authentication?.roles || rawSpec.auth?.roles || rawSpec.features?.roles || [];
  const roles = (Array.isArray(requestedRoles) ? requestedRoles : []).map((role, index) => {
    const source = typeof role === "object" && role ? role : {};
    const name = String(typeof role === "string" ? role : source.name || `Role ${index + 1}`).trim().slice(0, 50);
    const id = toIdentifier(source.id || name, `role${index + 1}`);
    const lower = name.toLowerCase();
    const adminLike = /admin|owner|super/.test(lower);
    return {
      id,
      name,
      selfSignup: source.selfSignup !== undefined ? Boolean(source.selfSignup) : !adminLike,
      dashboardId: toIdentifier(source.dashboardId || source.dashboard || `${id}Dashboard`, `${id}Dashboard`),
      allowedScreens: uniqueStrings(source.allowedScreens || source.screens || [], 40).map((screenId) => toIdentifier(screenId)),
    };
  });
  const uniqueRoles = [...new Map(roles.map((role) => [role.id, role])).values()].slice(0, 12);
  const authentication = normalizeAuthentication(rawSpec, uniqueRoles);
  if (authentication.enabled && !uniqueRoles.length) uniqueRoles.push({ id: "user", name: "User" });
  authentication.roleIds = authentication.enabled ? uniqueRoles.map((role) => role.id) : [];

  const splashSource = rawSpec.splash || {};
  const splash = {
    enabled: Boolean(splashSource.enabled ?? rawSpec.features?.hasSplash ?? true),
    title: String(splashSource.title || appName).trim().slice(0, 80),
    subtitle: String(splashSource.subtitle || "").trim().slice(0, 120),
    icon: String(splashSource.icon || rawSpec.logo || "apps").trim(),
    showIcon: splashSource.showIcon !== false,
    durationMilliseconds: Math.min(5000, Math.max(300, Number(splashSource.durationMilliseconds || 1400))),
  };

  const relationships = (Array.isArray(rawSpec.relationships) ? rawSpec.relationships : []).map((relationship, index) => ({
    id: toIdentifier(relationship.id || `${relationship.sourceEntity || "source"}_${relationship.targetEntity || "target"}`, `relationship${index + 1}`),
    type: VALID_RELATIONSHIP_TYPES.has(relationship.type) ? relationship.type : "oneToMany",
    sourceEntity: toIdentifier(relationship.sourceEntity, "source"),
    targetEntity: toIdentifier(relationship.targetEntity, "target"),
    targetField: ["oneToOne", "oneToMany"].includes(relationship.type)
      ? toIdentifier(relationship.targetField || `${relationship.sourceEntity || "parent"}Id`, "parentId")
      : null,
    required: Boolean(relationship.required),
    onDelete: VALID_DELETE_POLICIES.has(relationship.onDelete) ? relationship.onDelete : "restrict",
    sourceDisplay: {
      showRelatedRecords: relationship.sourceDisplay?.showRelatedRecords !== false,
      sectionTitle: String(relationship.sourceDisplay?.sectionTitle || "Related records").trim().slice(0, 80),
    },
  }));

  for (const relationship of relationships) {
    if (!["oneToOne", "oneToMany"].includes(relationship.type)) continue;
    const target = entities.find((entity) => entity.id === relationship.targetEntity);
    if (!target) continue;
    const existing = target.fields.find((field) => field.id === relationship.targetField);
    if (existing) {
      Object.assign(existing, { type: "reference", referenceEntity: relationship.sourceEntity, required: relationship.required || existing.required, unique: relationship.type === "oneToOne", filterable: true });
      continue;
    }
    target.fields.push({
      id: relationship.targetField,
      name: relationship.targetField,
      label: `${titleCase(relationship.sourceEntity)} ID`,
      type: "reference",
      required: relationship.required,
      unique: relationship.type === "oneToOne",
      searchable: false,
      filterable: true,
      sortable: false,
      listVisible: false,
      detailsVisible: true,
      readOnly: false,
      referenceEntity: relationship.sourceEntity,
    });
  }

  const providedScreens = Array.isArray(rawSpec.screens) ? rawSpec.screens : [];
  const screens = (providedScreens.length ? providedScreens : defaultScreens(entities, authentication, splash)).map((screen, index) => ({
    ...clone(screen),
    id: toIdentifier(screen.id || screen.title, `screen${index + 1}`),
    type: VALID_SCREEN_TYPES.has(screen.type) ? screen.type : "custom",
    title: String(screen.title || titleCase(screen.id) || `Screen ${index + 1}`).trim().slice(0, 80),
    ...(screen.entityId ? { entityId: toIdentifier(screen.entityId, "record") } : {}),
  }));

  // Role dashboards remain declarative AppSpec data. The renderer can use the
  // same dashboard component with different cards/navigation per role.
  const roleDashboards = uniqueRoles.map((role) => ({
    id: role.dashboardId,
    roleId: role.id,
    title: `${role.name} Dashboard`,
    widgets: Array.isArray((rawSpec.dashboards || []).find((dashboard) => dashboard.roleId === role.id)?.widgets)
      ? clone((rawSpec.dashboards || []).find((dashboard) => dashboard.roleId === role.id).widgets)
      : [],
  }));

  const navigationSource = rawSpec.navigation || {};
  const defaultNavScreens = [screens.find((screen) => screen.id === "dashboard"), screens.find((screen) => screen.type === "entityList"), screens.find((screen) => screen.id === "profile"), screens.find((screen) => screen.id === "settings")].filter(Boolean);
  const navigation = {
    type: ["responsive", "bottom", "rail", "drawer", "tabs"].includes(navigationSource.type) ? navigationSource.type : "responsive",
    phoneStyle: navigationSource.phoneStyle || "bottomNavigation",
    desktopStyle: navigationSource.desktopStyle || "navigationRail",
    items: (Array.isArray(navigationSource.items) && navigationSource.items.length ? navigationSource.items : defaultNavScreens).map((item, index) => {
      const screenId = toIdentifier(item.screenId || item.id, `screen${index + 1}`);
      const screen = screens.find((candidate) => candidate.id === screenId);
      return { id: toIdentifier(item.id || screenId, `nav${index + 1}`), label: String(item.label || screen?.title || titleCase(screenId)), icon: String(item.icon || "circle"), screenId };
    }),
  };

  const permissions = (Array.isArray(rawSpec.permissions) ? rawSpec.permissions : []).map((permission) => ({
    roleId: toIdentifier(permission.roleId, "user"),
    resource: permission.resource === "*" ? "*" : toIdentifier(permission.resource, "record"),
    actions: uniqueStrings(permission.actions || []).filter((action) => VALID_ACTIONS.has(action)),
  }));
  if (authentication.enabled && !permissions.length) {
    for (const role of uniqueRoles) permissions.push({ roleId: role.id, resource: "*", actions: ["create", "read", "update", "delete"] });
  }

  const theme = normalizeTheme(rawSpec.theme, warnings);
  const spec = {
    specVersion: APP_SPEC_VERSION,
    app: { id: toIdentifier(rawSpec.app?.id || appName, "generatedApp"), name: appName, description: String(rawSpec.app?.description || "").trim(), storageMode },
    theme,
    authentication,
    splash,
    navigation,
    entities,
    relationships,
    screens,
    dashboards: roleDashboards.length ? roleDashboards : (Array.isArray(rawSpec.dashboards) ? clone(rawSpec.dashboards) : []),
    roles: uniqueRoles,
    permissions,
    rules: Array.isArray(rawSpec.rules) ? clone(rawSpec.rules) : [],
    workflows: Array.isArray(rawSpec.workflows) ? clone(rawSpec.workflows) : [],
    computedFields: Array.isArray(rawSpec.computedFields) ? clone(rawSpec.computedFields) : [],
    views: Array.isArray(rawSpec.views) ? clone(rawSpec.views) : [],
    seedData: rawSpec.seedData && typeof rawSpec.seedData === "object" ? clone(rawSpec.seedData) : {},
    customCapabilities: Array.isArray(rawSpec.customCapabilities) ? clone(rawSpec.customCapabilities) : [],
    requirements: Array.isArray(rawSpec.requirements) ? clone(rawSpec.requirements) : [],
  };

  // Legacy aliases keep the existing factory operational during the compiler replacement.
  const primary = entities[0];
  spec.appName = appName;
  spec.entity = primary.name;
  spec.fields = primary.fields.map((field) => ({ ...field, name: field.id }));
  spec.storageMode = ["memory", "local"].includes(spec.app.storageMode) ? "local" : spec.app.storageMode;
  // Preserve renderer-facing presentation fields while AppSpec V2 remains the canonical model.
  spec.domain = String(rawSpec.domain || "Business").trim();
  spec.logo = String(rawSpec.logo || "✨").trim();
  spec.layout = String(rawSpec.layout || "card_stack").trim();
  spec.uiVariant = Number.isFinite(Number(rawSpec.uiVariant)) ? Number(rawSpec.uiVariant) : 0;
  spec.uiPreset = String(rawSpec.uiPreset || rawSpec.designPreset || "modern").trim().toLowerCase();
  spec.emptyState = String(rawSpec.emptyState || `No ${primary.name.toLowerCase()} records yet`);
  spec.cta = String(rawSpec.cta || `Add ${primary.name}`);
  spec.features = {
    ...(rawSpec.features || {}),
    hasAuth: authentication.enabled,
    roles: uniqueRoles.map((role) => role.name),
    hasSplash: splash.enabled,
    allowSignup: authentication.allowSignup,
  };

  return { valid: errors.length === 0, spec, errors, warnings };
}

module.exports = { normalizeAppSpec };
