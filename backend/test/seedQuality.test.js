const test = require("node:test");
const assert = require("node:assert/strict");
const { getContextAwarePlan } = require("../services/contextAwareAppPlanner");
const { buildWorkspaceComponentSpec } = require("../services/ai/workspaceComponentSpec");
const { buildMultiEntityFlutterApp, seedValue } = require("../services/multiEntityFlutterCompiler");
const { populateSeedData } = require("../services/ai/seedPlanner");
const { buildSeedRows } = require("../services/sampleData");

const PROMPTS = [
  "student management system",
  "hospital management system",
  "e-commerce marketplace with seller portal",
  "inventory management system",
  "library management system",
  "gym management system",
  "school timetable management",
  "restaurant management system",
  "hr management system",
  "help desk support ticket system",
];

// Placeholder shapes the old generator produced.
const BANNED = [
  [/\b(North|Central|South|East|West)\b/, "cardinal-direction placeholder"],
  [/sample for .* operations/i, "'<label> sample for <entity> operations'"],
  [/\b(?:Field|Value|Item|Record) \d+\b/, "'Field 1' style filler"],
];

function specFor(prompt) {
  const plan = getContextAwarePlan(prompt);
  assert.ok(plan, `no plan for "${prompt}"`);
  return buildWorkspaceComponentSpec(plan, prompt);
}

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => strings(item, out));
  return out;
}

test("seed rows contain no placeholder text for any common domain", () => {
  for (const prompt of PROMPTS) {
    const rows = buildSeedRows(specFor(prompt), { rows: 3 });
    for (const text of strings(rows)) {
      for (const [re, what] of BANNED) assert.doesNotMatch(text, re, `${what} in "${prompt}": "${text}"`);
    }
  }
});

test("compiled Dart source ships the same clean seed data", () => {
  for (const prompt of PROMPTS) {
    const code = buildMultiEntityFlutterApp(specFor(prompt)).code;
    // Only inspect the seed-data block, not UI copy such as 'Field required'.
    const at = code.indexOf("<Map<String, dynamic>>[<String, dynamic>{'id':");
    assert.ok(at >= 0, `no seed data block found in compiled "${prompt}"`);
    const seed = code.slice(at, at + 20000);
    for (const [re, what] of BANNED) assert.doesNotMatch(seed, re, `${what} in compiled "${prompt}"`);
  }
});

test("compiled student app: students point at classes that exist, entity names are not used as titles", () => {
  const spec = specFor("student management system");
  const code = buildMultiEntityFlutterApp(spec).code;
  const rows = buildSeedRows(spec, { rows: 3 });
  for (const row of rows.student) {
    assert.match(row.name, /^[A-Z][a-z]+ [A-Z][a-z]+$/, `student name "${row.name}"`);
    assert.ok(code.includes(`'${row.name}'`), `student "${row.name}" is missing from the compiled app`);
    assert.ok(rows.class.some((c) => c.name === row.className), `class "${row.className}" does not exist`);
    assert.ok(code.includes(`'${row.className}'`), `class link "${row.className}" is missing from the compiled app`);
  }
});

test("seed data from the planner is used when present and the built-in rows are the fallback", () => {
  const spec = specFor("student management system");
  const custom = buildSeedRows(spec, { rows: 3 });
  custom.student[0].name = "Custom Person";
  const code = buildMultiEntityFlutterApp({ ...spec, seedData: custom }).code;
  assert.ok(code.includes("'Custom Person'"));
  const fallback = buildMultiEntityFlutterApp(spec).code;
  assert.ok(!fallback.includes("Custom Person"));
});

test("provider failure keeps clean, linked data and still returns three rows per entity", async () => {
  for (const prompt of ["student management system", "hospital management system"]) {
    const spec = specFor(prompt);
    const { seedData, warnings } = await populateSeedData(spec, async () => { throw new Error("429 rate limited"); });
    assert.ok(warnings.length > 0);
    for (const entity of spec.entities) assert.equal(seedData[entity.id].length, 3, `${entity.id} rows`);
    for (const text of strings(seedData)) {
      for (const [re, what] of BANNED) assert.doesNotMatch(text, re, `${what} in "${prompt}": "${text}"`);
    }
  }
});

test("seedValue keeps its public signature and is domain-aware", () => {
  const entity = { id: "patient", name: "Patient", fields: [] };
  const name = seedValue(entity, { id: "name", label: "Name", type: "text" }, 1, [entity]);
  assert.match(name, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
  const dept = { id: "dept", name: "Department", fields: [] };
  const hospital = seedValue(dept, { id: "name", label: "Name", type: "text" }, 0, [dept], { domain: "hospital" });
  assert.equal(hospital, "Cardiology");
  // reference fields still resolve to the parent's generated id
  const child = { id: "visit", name: "Visit", fields: [] };
  assert.equal(seedValue(child, { id: "patientId", label: "Patient", type: "reference", referenceEntity: "patient" }, 4, [entity, child]), "patient-2");
});
