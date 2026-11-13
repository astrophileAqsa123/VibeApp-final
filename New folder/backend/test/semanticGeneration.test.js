const test = require("node:test");
const assert = require("node:assert/strict");
const { getContextAwarePlan } = require("../services/contextAwareAppPlanner");
const { buildWorkspaceComponentSpec } = require("../services/ai/workspaceComponentSpec");
const { buildMultiEntityFlutterApp, seedValue } = require("../services/multiEntityFlutterCompiler");
const { populateSeedData } = require("../services/ai/seedPlanner");
const { buildSeedRows } = require("../services/sampleData");
const { inferEntityFields } = require("../services/ai/entityFieldInference");

function workspaceSpec(prompt) {
  const plan = getContextAwarePlan(prompt);
  assert.equal(plan?.family, "workspace", `"${prompt}" should be a workspace app`);
  return buildWorkspaceComponentSpec(plan, prompt);
}

const PLACEHOLDER = /\b(North|Central|West)\b|sample for .* operations/i;

const PROMPTS = [
  "student management system",
  "hospital management system",
  "hotel management system",
  "library management system",
  "restaurant management system",
  "inventory management system",
  "hr management system",
  "e-commerce marketplace with seller portal",
  "project management workspace",
  "gym management system",
  "real estate property management",
  "pharmacy management system",
  "event management platform",
  "bank management system",
  "help desk support ticket system",
  "delivery and logistics management",
];

test("compiled apps never ship placeholder sample data (North/Central/West, 'Notes sample for ...')", () => {
  for (const prompt of PROMPTS) {
    const spec = workspaceSpec(prompt);
    const code = buildMultiEntityFlutterApp(spec).code;
    assert.doesNotMatch(code, PLACEHOLDER, `placeholder data in "${prompt}"`);
    // No "<Entity> 1" style titles either.
    for (const entity of spec.entities) {
      assert.doesNotMatch(code, new RegExp(`'title': '${entity.name} \\d'`), `${entity.name} title placeholder in "${prompt}"`);
    }
  }
});

test("student management data reads like a real school", () => {
  const spec = workspaceSpec("student management system");
  const rows = buildSeedRows(spec, { rows: 5 });
  const classNames = new Set(rows.class.map((row) => row.name));
  const studentNames = new Set(rows.student.map((row) => row.name));
  assert.ok(rows.student.every((row) => classNames.has(row.className)), "student.className must be a real class");
  assert.ok(rows.attendance.every((row) => studentNames.has(row.studentName)), "attendance must point at real students");
  assert.ok(rows.grade.every((row) => studentNames.has(row.studentName)));
  assert.ok(rows.grade.every((row) => typeof row.score === "number" && row.score >= 0 && row.score <= 100));
  assert.ok(rows.student.every((row) => /^\+?[\d\s]+$/.test(row.phone)));
  assert.ok(rows.timetable.some((row) => /Period/.test(row.title)));
});

test("sample dates are relative to today so apps do not look stale", () => {
  const spec = workspaceSpec("student management system");
  const now = new Date(Date.UTC(2030, 0, 15));
  const rows = buildSeedRows(spec, { rows: 3, now });
  const dates = Object.values(rows).flat().flatMap((row) => Object.values(row)).filter((v) => /^\d{4}-\d\d-\d\d$/.test(String(v)));
  assert.ok(dates.length > 0);
  for (const value of dates) {
    const year = Number(value.slice(0, 4));
    assert.ok(year >= 2029 && year <= 2030, `${value} should be near 2030-01-15`);
  }
});

test("a person-reference field is a person even when a domain rule mentions the same word", () => {
  const rows = buildSeedRows(workspaceSpec("hospital management system"), { rows: 3 });
  const departmentNames = new Set(rows.department.map((row) => row.name));
  for (const row of rows.department) {
    assert.ok(!departmentNames.has(row.head), `department head "${row.head}" must be a person, not a department`);
  }
});

test("the head noun decides the record type ('Seller Order' is an order, not a company)", () => {
  const rows = buildSeedRows(workspaceSpec("e-commerce marketplace with seller portal"), { rows: 3 });
  assert.match(rows.sellerOrder[0].title, /Order #/);
  assert.match(rows.seller[0].email, /@/);
});

test("seedValue stays available and returns semantic values", () => {
  const entity = { id: "student", name: "Student", fields: [] };
  const value = seedValue(entity, { id: "name", label: "Name", type: "text" }, 0, [entity]);
  assert.doesNotMatch(String(value), /North|Central|West/);
  assert.match(String(value), /^[A-Z][a-z]+ [A-Z][a-z]+$/);
});

test("provider failure during seed generation still yields realistic data", async () => {
  const spec = workspaceSpec("student management system");
  const result = await populateSeedData(spec, async () => { throw new Error("rate limited"); });
  assert.ok(result.warnings.length > 0);
  assert.doesNotMatch(JSON.stringify(result.seedData), PLACEHOLDER);
  assert.equal(result.seedData.student.length, 3);
});

test("entities are shaped by what they are, not title/status/notes for everything", () => {
  const field = (label, domain = "") => (inferEntityFields(label, domain) || []).map(([id]) => id);
  assert.deepEqual(field("Employee").slice(0, 3), ["name", "role", "department"]);
  assert.ok(field("Ticket").includes("priority"));
  assert.ok(field("Product").includes("price") && field("Product").includes("quantity"));
  assert.ok(field("Shipment").includes("recipientName"));
  assert.ok(field("Task").includes("dueDate"));
  assert.ok(field("Order").includes("amount"));
  assert.ok(field("Attendance", "hr").includes("employeeName"));
  assert.ok(field("Attendance", "fitness_coaching").includes("memberName"));
  // The head noun wins: a Seller Order is an order, not a seller.
  assert.ok(field("Seller Order").includes("amount"));
  assert.ok(!field("Seller Order").includes("email"));
  // "Catalog" must not be read as a log.
  assert.ok(field("Catalog").includes("author"));
  assert.equal(inferEntityFields("Zxcv Widget"), null);
});

test("generated entities have a display field that really exists", () => {
  for (const prompt of PROMPTS) {
    const spec = workspaceSpec(prompt);
    for (const entity of spec.entities) {
      assert.ok(entity.fields.some((f) => f.id === entity.displayField), `${prompt}: ${entity.id}.displayField ${entity.displayField} missing`);
    }
  }
});

test("acronym entity names produce clean identifiers", () => {
  const spec = workspaceSpec("help desk support ticket system");
  assert.ok(spec.entities.some((entity) => entity.id === "slaPolicy"), spec.entities.map((e) => e.id).join(","));
});
