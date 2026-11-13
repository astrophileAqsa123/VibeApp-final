const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAppSpec } = require("../services/appSpec");
const { buildMultiEntityFlutterApp } = require("../services/multiEntityFlutterCompiler");
const { checkFlutterCodeSyntax } = require("../services/exact500AppTemplates/flutterCodeSafety");
const generationRouter = require("../routes/templateGenerate");
const { planStructuredPrompt } = require("../services/ai/structuredPromptPlanner");

function buildSpec() {
  const result = normalizeAppSpec({
    app: { id: "colony", name: "Mars Colony Manager", storageMode: "memory" },
    entities: [
      {
        id: "habitat",
        name: "Habitat",
        fields: [
          { id: "name", label: "Name", required: true },
          { id: "capacity", label: "Capacity", type: "number" },
          { id: "status", label: "Status", type: "select", options: ["Active", "Maintenance"] },
        ],
      },
      {
        id: "colonist",
        name: "Colonist",
        fields: [
          { id: "name", label: "Name", required: true },
          { id: "age", label: "Age", type: "number" },
          { id: "occupation", label: "Occupation" },
        ],
      },
      {
        id: "mission",
        name: "Mission",
        fields: [
          { id: "name", label: "Name", required: true },
          { id: "destination", label: "Destination" },
        ],
      },
    ],
    relationships: [
      { id: "habitatColonists", type: "oneToMany", sourceEntity: "habitat", targetEntity: "colonist", targetField: "habitatId", required: true, onDelete: "restrict" },
      { id: "missionColonists", type: "manyToMany", sourceEntity: "mission", targetEntity: "colonist", onDelete: "restrict" },
    ],
  });
  assert.equal(result.valid, true, result.errors.join("; "));
  return result.spec;
}

test("multi-entity compiler emits CRUD, details, relationships and integrity guards", () => {
  const spec = buildSpec();
  const result = buildMultiEntityFlutterApp(spec);

  assert.equal(checkFlutterCodeSyntax(result.code).valid, true);
  assert.match(result.code, /class NormalizedMemoryStore extends ChangeNotifier/);
  assert.match(result.code, /class EntityListScreen extends StatefulWidget/);
  assert.match(result.code, /class EntityDetailsScreen extends StatelessWidget/);
  assert.match(result.code, /class EntityFormScreen extends StatefulWidget/);
  assert.match(result.code, /id: 'habitat'/);
  assert.match(result.code, /id: 'colonist'/);
  assert.match(result.code, /id: 'mission'/);
  assert.match(result.code, /type: 'manyToMany'/);
  assert.match(result.code, /Cannot delete this record while related/);
  assert.match(result.code, /syncManyToMany/);
  assert.equal(result.entrypoint, "lib/main.dart");
  assert.deepEqual(result.fileManifest[0].entities, ["habitat", "colonist", "mission"]);
});

test("multi-entity routing is narrow and does not change simple CRUD generation", () => {
  assert.equal(generationRouter.isMultiEntityPrompt("make a trip management app"), false);
  assert.equal(generationRouter.isMultiEntityPrompt("Build a library where books belong to a library and have many authors with full CRUD"), true);
  assert.equal(generationRouter.isMultiEntityPrompt("Entities: Colonist, Habitat, Mission. Full CRUD for every entity."), true);
});

test("explicit entity and relationship sections have a complete non-AI fallback", () => {
  const plan = planStructuredPrompt(`Build an app called “Mars Colony Manager”.
    Entities: Colonist id name age assignedHabitat Habitat id name capacity Mission id name destination Resource id name quantity Incident id title severity Equipment id name condition assignedHabitat.
    Relationships: A Habitat contains many Colonists. A Habitat stores many Resources. A Habitat can contain multiple Equipment items. A Colonist can participate in many Missions. A Mission can consume multiple Resources. An Incident can involve multiple Colonists. Equipment can have maintenance records.
    Requirements: Full CRUD, dashboard, search, deletion confirmation, local persistence, sample data, loading and error states.`);
  assert.ok(plan);
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.spec.entities.map((entity) => entity.id), ["colonist", "habitat", "mission", "resource", "incident", "equipment", "maintenanceRecord"]);
  assert.equal(plan.spec.relationships.length, 7);
  assert.equal(plan.spec.app.storageMode, "local");
});
