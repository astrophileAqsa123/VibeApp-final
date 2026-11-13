const test = require("node:test");
const assert = require("node:assert/strict");
const { planApplication, buildPlannerMessages, classifyCapabilityTags } = require("../services/ai/componentPlanner");

test("planner retrieves relationship and permission components from the prompt", () => {
  const tags = classifyCapabilityTags("Books belong to a library, have multiple authors, and viewers are read only");
  assert.ok(tags.includes("relationship"));
  assert.ok(tags.includes("permissions"));
  assert.ok(tags.includes("auth"));
  const messages = buildPlannerMessages("Build a library app");
  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /Return JSON only/);
  assert.doesNotMatch(messages[0].content, /Return only Dart code/);
});

test("planner converts structured AI output into a validated component plan", async () => {
  const fakeOutput = {
    requirements: [
      { id: "R1", text: "Manage libraries", category: "crud", priority: "required", implementedBy: ["entity.library"] },
      { id: "R2", text: "Show related books", category: "relationship", priority: "required", implementedBy: ["relationship.libraryBooks"] },
    ],
    assumptions: ["Authentication was not requested."],
    appSpec: {
      app: { id: "libraryManager", name: "Library Manager", storageMode: "memory" },
      splash: { enabled: false },
      entities: [
        { id: "library", name: "Library", fields: [{ id: "name", type: "text", required: true }] },
        { id: "book", name: "Book", fields: [{ id: "title", type: "text", required: true }] },
      ],
      relationships: [
        { id: "libraryBooks", type: "oneToMany", sourceEntity: "library", targetEntity: "book", required: true, onDelete: "restrict" },
      ],
    },
  };
  const result = await planApplication("Build a library app", { complete: async () => JSON.stringify(fakeOutput) });
  assert.equal(result.ready, true);
  assert.equal(result.spec.app.name, "Library Manager");
  assert.ok(result.componentPlan.some((component) => component.id === "relationship.oneToMany"));
  assert.equal(result.coverage.complete, true);
  assert.deepEqual(result.coverage.uncovered, []);
});

test("planner refuses to mark unmapped requirements ready", async () => {
  const result = await planApplication("Build an unusual scoring app", {
    complete: async () => ({
      requirements: [{ id: "R1", text: "Use a custom score", implementedBy: [] }],
      appSpec: {
        app: { name: "Scoring" },
        entities: [{ id: "entry", name: "Entry", fields: [{ id: "name", type: "text" }] }],
      },
    }),
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.coverage.uncovered, ["R1"]);
});
