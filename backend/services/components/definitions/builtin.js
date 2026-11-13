const components = [
  { id: "core.app", version: 1, tags: ["core"], description: "Flutter application entrypoint and application lifecycle", dependencies: [], produces: ["main", "app"] },
  { id: "core.theme", version: 1, tags: ["theme", "core"], description: "Material theme, colors, typography and theme controller", dependencies: ["core.app"], produces: ["theme"] },
  { id: "core.validation", version: 1, tags: ["validation", "core"], description: "Reusable form and business validation results", dependencies: ["core.app"], produces: ["validation"] },
  { id: "core.storage.memory", version: 1, tags: ["storage", "crud", "core"], description: "Normalized in-memory repositories and relationship store", dependencies: ["core.app"], produces: ["repository", "store"] },
  { id: "core.storage.local", version: 1, tags: ["storage", "crud", "core"], description: "Normalized local persistence with seeded first-run data", dependencies: ["core.app"], produces: ["repository", "store", "persistence"] },
  { id: "core.seed", version: 1, tags: ["core", "entity"], description: "Realistic first-run seed records for every entity", dependencies: ["core.storage.local"], produces: ["seedData"] },
  { id: "core.uiStates", version: 1, tags: ["core", "screen"], description: "Reusable empty, loading and recoverable error states", dependencies: ["core.app"], produces: ["emptyState", "loadingState", "errorState"] },
  { id: "auth.basic", version: 1, tags: ["auth"], description: "Configurable login, signup, logout and preview session", dependencies: ["core.app", "core.validation"], produces: ["authModel", "authRepository", "authController", "loginScreen", "signupScreen"] },
  { id: "auth.verification", version: 1, tags: ["auth", "verification"], description: "In-memory OTP, link, code or approval verification simulation", dependencies: ["auth.basic"], produces: ["verificationService", "verificationScreen"] },
  { id: "security.rbac", version: 1, tags: ["auth", "roles", "permissions"], description: "Role-based navigation, route, control and service authorization", dependencies: ["auth.basic"], produces: ["permissionService", "routeGuard", "actionGuard"] },
  { id: "app.splash", version: 1, tags: ["splash"], description: "Configurable splash screen", dependencies: ["core.app", "core.theme"], produces: ["splashScreen"] },
  { id: "navigation.responsive", version: 1, tags: ["navigation"], description: "Bottom navigation on phones and navigation rail on wide layouts", dependencies: ["core.app", "core.theme"], produces: ["router", "appShell"] },
  { id: "screen.dashboard", version: 1, tags: ["dashboard", "screen"], description: "Role-aware dashboard with configured metrics and recent records", dependencies: ["navigation.responsive", "core.storage.memory"], produces: ["dashboardScreen"] },
  { id: "screen.profile", version: 1, tags: ["profile", "screen"], description: "Current user profile, role and logout screen", dependencies: ["navigation.responsive"], produces: ["profileScreen"] },
  { id: "screen.settings", version: 1, tags: ["settings", "screen"], description: "Theme and common application settings", dependencies: ["navigation.responsive", "core.theme"], produces: ["settingsScreen"] },
  { id: "entity.crud", version: 1, tags: ["crud", "entity"], description: "Model, repository, service, list, form and details screens for an entity", dependencies: ["core.storage.memory", "core.validation", "navigation.responsive"], produces: ["model", "service", "listScreen", "formScreen", "detailsScreen"] },
  { id: "entity.search", version: 1, tags: ["crud", "search"], description: "Entity search, filters and sorting", dependencies: ["entity.crud"], produces: ["searchController", "filterBar"] },
  { id: "relationship.oneToOne", version: 1, tags: ["relationship"], description: "One-to-one references, picker and integrity rules", dependencies: ["entity.crud"], produces: ["referencePicker", "relationshipQuery"] },
  { id: "relationship.oneToMany", version: 1, tags: ["relationship"], description: "Parent-child references, related lists and delete policies", dependencies: ["entity.crud"], produces: ["parentPicker", "relatedRecords", "deletePolicy"] },
  { id: "relationship.manyToMany", version: 1, tags: ["relationship"], description: "Join records, multi-select picker and bidirectional related lists", dependencies: ["entity.crud"], produces: ["joinModel", "multiPicker", "relatedRecords"] },
  { id: "rule.standard", version: 1, tags: ["rules", "businessLogic"], description: "Built-in validation, confirmation, conflict and conditional rules", dependencies: ["core.validation", "core.storage.memory"], produces: ["businessRules"] },
  { id: "workflow.standard", version: 1, tags: ["workflow", "businessLogic"], description: "Status states, allowed transitions and role checks", dependencies: ["rule.standard"], produces: ["workflowService", "statusActions"] },
  { id: "extension.custom", version: 1, tags: ["custom"], description: "Typed boundary for bounded AI-generated rules, actions, widgets and screens", dependencies: ["core.app"], produces: ["extensionRegistry"] },
];

const STANDARD_RULE_TYPES = new Set([
  "requiredIf", "unique", "numericRange", "dateRange", "dateRangeConflict",
  "referentialIntegrity", "confirmAction", "preventAction", "conditionalVisibility",
  "conditionalEditability", "derivedValue", "statusTransition",
]);

module.exports = { components, STANDARD_RULE_TYPES };
