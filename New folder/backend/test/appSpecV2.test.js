const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeAppSpec,
  validateAppSpec,
  applySpecPatch,
  evaluateRequirementCoverage,
} = require("../services/appSpec");
const { ComponentRegistry, resolveComponents } = require("../services/components");

function librarySpec() {
  return {
    app: { name: "Library Manager", storageMode: "memory" },
    authentication: { enabled: true, allowSignup: true },
    roles: ["Administrator", "Viewer"],
    entities: [
      { id: "library", name: "Library", fields: [{ id: "name", type: "text", required: true, searchable: true }] },
      { id: "book", name: "Book", fields: [{ id: "title", type: "text", required: true, searchable: true }] },
      { id: "author", name: "Author", fields: [{ id: "name", type: "text", required: true, searchable: true }] },
    ],
    relationships: [
      { id: "libraryBooks", type: "oneToMany", sourceEntity: "library", targetEntity: "book", targetField: "libraryId", required: true, onDelete: "restrict" },
      { id: "bookAuthors", type: "manyToMany", sourceEntity: "book", targetEntity: "author", onDelete: "detach" },
    ],
    permissions: [
      { roleId: "administrator", resource: "*", actions: ["create", "read", "update", "delete"] },
      { roleId: "viewer", resource: "*", actions: ["read"] },
    ],
    requirements: [
      { id: "R1", text: "Search books", implementedBy: ["screen.bookList.searchBar"] },
      { id: "R2", text: "Show books on library details", implementedBy: ["relationship.libraryBooks"] },
    ],
  };
}

test("AppSpec V2 normalizes relational CRUD applications", () => {
  const result = normalizeAppSpec(librarySpec());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.spec.specVersion, 2);
  assert.deepEqual(result.spec.entities.map((entity) => entity.id), ["library", "book", "author"]);
  const libraryId = result.spec.entities.find((entity) => entity.id === "book").fields.find((field) => field.id === "libraryId");
  assert.equal(libraryId.type, "reference");
  assert.equal(libraryId.required, true);
  assert.equal(libraryId.referenceEntity, "library");
  assert.ok(result.spec.screens.some((screen) => screen.id === "libraryDetails"));
  assert.deepEqual(result.spec.authentication.roleIds, ["administrator", "viewer"]);
});

test("semantic validation rejects contradictory required detach relationships", () => {
  const result = normalizeAppSpec({
    ...librarySpec(),
    relationships: [{ id: "libraryBooks", type: "oneToMany", sourceEntity: "library", targetEntity: "book", required: true, onDelete: "detach" }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("cannot use detach")));
});

test("component resolver produces an ordered relational application plan", () => {
  const { spec } = normalizeAppSpec(librarySpec());
  const result = resolveComponents(spec, new ComponentRegistry());
  const ids = result.components.map((component) => component.id);
  assert.ok(ids.indexOf("core.storage.memory") < ids.indexOf("entity.crud"));
  assert.ok(ids.includes("relationship.oneToMany"));
  assert.ok(ids.includes("relationship.manyToMany"));
  assert.ok(ids.includes("security.rbac"));
  assert.deepEqual(result.missingCapabilities, []);
});

test("unknown business rules become bounded missing capabilities", () => {
  const { spec } = normalizeAppSpec({
    ...librarySpec(),
    rules: [{ id: "rankRecommendations", type: "semanticBookRecommendation", requirementIds: ["R3"] }],
  });
  const result = resolveComponents(spec);
  assert.equal(result.missingCapabilities.length, 1);
  assert.equal(result.missingCapabilities[0].type, "businessRule");
  assert.ok(result.components.some((component) => component.id === "extension.custom"));
});

test("AppSpec edits are explicit operations with impacted paths", () => {
  const { spec } = normalizeAppSpec(librarySpec());
  const patched = applySpecPatch(spec, {
    operations: [
      { op: "addField", entityId: "book", field: { id: "publicationYear", label: "Publication Year", type: "number" } },
      { op: "setPermission", roleId: "viewer", resource: "author", actions: ["read"] },
      { op: "removeSplash" },
    ],
  });
  assert.ok(patched.spec.entities.find((entity) => entity.id === "book").fields.some((field) => field.id === "publicationYear"));
  assert.deepEqual(patched.spec.permissions.find((permission) => permission.roleId === "viewer" && permission.resource === "author").actions, ["read"]);
  assert.equal(patched.spec.splash.enabled, false);
  assert.ok(patched.changedPaths.includes("entities.book.fields.publicationYear"));
  assert.equal(validateAppSpec(patched.spec).valid, true);
});

test("requirement coverage verifies mapped component paths", () => {
  const { spec } = normalizeAppSpec(librarySpec());
  let coverage = evaluateRequirementCoverage(spec);
  assert.equal(coverage.complete, true);
  spec.requirements.push({ id: "R3", text: "Unsupported item", implementedBy: ["screen.missing"] });
  coverage = evaluateRequirementCoverage(spec);
  assert.equal(coverage.complete, false);
  assert.deepEqual(coverage.uncovered, ["R3"]);
});
