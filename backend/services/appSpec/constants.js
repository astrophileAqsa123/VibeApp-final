const APP_SPEC_VERSION = 2;
const MAX_ENTITIES = 24;
const MAX_FIELDS_PER_ENTITY = 40;

const VALID_FIELD_TYPES = new Set([
  "text", "textarea", "number", "decimal", "currency", "boolean",
  "date", "datetime", "email", "phone", "password", "select",
  "multiselect", "status", "url", "reference", "computed",
]);
const VALID_RELATIONSHIP_TYPES = new Set(["oneToOne", "oneToMany", "manyToMany"]);
const VALID_DELETE_POLICIES = new Set(["restrict", "cascade", "detach", "custom"]);
const VALID_ACTIONS = new Set(["create", "read", "update", "delete"]);
const VALID_SCREEN_TYPES = new Set([
  "login", "signup", "verification", "forgotPassword", "splash",
  "dashboard", "entityList", "entityForm", "entityDetails", "profile",
  "settings", "reports", "custom",
]);

module.exports = {
  APP_SPEC_VERSION,
  MAX_ENTITIES,
  MAX_FIELDS_PER_ENTITY,
  VALID_FIELD_TYPES,
  VALID_RELATIONSHIP_TYPES,
  VALID_DELETE_POLICIES,
  VALID_ACTIONS,
  VALID_SCREEN_TYPES,
};
