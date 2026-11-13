const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildProjectVersion,
  ensureCurrentVersionSnapshot,
} = require("../services/projectVersioning");

test("an initial project version captures code and generation metadata", () => {
  const snapshot = buildProjectVersion({
    version: 1,
    prompt: "Build an inventory app",
    source: "template",
    generatedCode: "void main() {}",
    storageMode: "supabase",
    tableSql: "create table products ();",
    supabaseTable: "products",
    appConfig: { entity: "Product" },
    appSpec: { specVersion: 2, app: { name: "Inventory" } },
    requirements: [{ id: "R1", text: "Manage products" }],
    componentPlan: [{ id: "entity.crud", version: 1 }],
    fileManifest: [{ path: "lib/main.dart", owner: "compiler" }],
    entrypoint: "lib/main.dart",
  });

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.generatedCode, "void main() {}");
  assert.equal(snapshot.storageMode, "supabase");
  assert.equal(snapshot.supabaseTable, "products");
  assert.deepEqual(snapshot.appConfig, { entity: "Product" });
  assert.equal(snapshot.appSpec.specVersion, 2);
  assert.equal(snapshot.requirements[0].id, "R1");
  assert.equal(snapshot.componentPlan[0].id, "entity.crud");
  assert.equal(snapshot.fileManifest[0].path, "lib/main.dart");
});

test("legacy recovery snapshots the actual current version exactly once", () => {
  const project = {
    version: 4,
    prompt: "Initial prompt",
    latestPrompt: "Latest edit",
    generationSource: "groq-diff-edit",
    generatedCode: "old code",
    currentCode: "current code",
    storageMode: "local",
    versions: [],
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  };

  assert.equal(ensureCurrentVersionSnapshot(project), true);
  assert.equal(project.versions.length, 1);
  assert.equal(project.versions[0].version, 4);
  assert.equal(project.versions[0].generatedCode, "current code");
  assert.equal(ensureCurrentVersionSnapshot(project), false);
  assert.equal(project.versions.length, 1);
});

test("legacy recovery never invents a snapshot without code", () => {
  const project = { version: 2, currentCode: "", generatedCode: "", versions: [] };
  assert.equal(ensureCurrentVersionSnapshot(project), false);
  assert.deepEqual(project.versions, []);
});
