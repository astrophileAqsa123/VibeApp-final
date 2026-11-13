const test = require("node:test");
const assert = require("node:assert/strict");
const { findBestTemplate } = require("../services/exact500AppTemplates");
const { normalizeAppSpec, contrastRatio } = require("../services/appSpec");
const templateRouter = require("../routes/templateGenerate");
const {
  calculateCompletionTokenBudget,
  assertValidFlutterCode,
} = require("../services/aiService");

const UI_EXAMPLE_PROMPTS = [
  "Create an e-commerce product catalog app with title, price, stock, category, and image URL fields",
  "Build an expense tracker and budget manager with title, amount, category, date, and payment method fields",
  "Build a sleek task and project manager with task name, priority, due date, and status fields",
  "Create a medical appointment booking app with patient name, doctor, appointment date, and phone fields",
  "Build a customer lead management CRM with company name, contact person, deal value, and pipeline stage fields",
];

test("all prompt examples shown in the UI pass the complexity gate", () => {
  for (const prompt of UI_EXAMPLE_PROMPTS) {
    assert.equal(templateRouter.isTooBigPrompt(prompt), false, prompt);
  }
});

test("genuinely multi-module prompts remain outside one-shot scope", () => {
  assert.equal(
    templateRouter.isTooBigPrompt(
      "Build a complete app with all modules, user roles, admin portal, customer portal and multiple screens"
    ),
    true
  );
});

test("record-management intents create generic compatibility configurations", () => {
  for (const prompt of [
    "medical appointment booking",
    "customer lead CRM",
    "real estate listing",
    "fleet maintenance",
  ]) {
    const match = findBestTemplate(prompt);
    assert.equal(match.matched, true, prompt);
    assert.ok(match.template?.appName, prompt);
    assert.ok(match.template?.entity, prompt);
  }
});

test("a simple library app matches the reliable template route", () => {
  const match = findBestTemplate("Build a simple library management app");
  assert.equal(match.matched, true);
  assert.match(match.template?.appName || "", /library/i);
});

test("short domain prompts do not fall back to title description and status", () => {
  const match = findBestTemplate("make a trip management app");
  const labels = match.template.fields.map((field) => field.label);
  assert.deepEqual(labels.slice(0, 4), ["Trip Name", "Destination", "Start Date", "End Date"]);
  assert.equal(labels.includes("Description"), false);
});

test("AI-inferred fields are assembled even when the user did not list fields", () => {
  const base = findBestTemplate("make a trip management app").template;
  const assembled = templateRouter.applyAiPlanToTemplate(base, {
    isCrud: true,
    appName: "TripFlow",
    entity: "Trip",
    hasExplicitFields: false,
    fields: [
      { name: "tripName", label: "Trip Name", type: "text", required: true },
      { name: "destination", label: "Destination", type: "text", required: true },
      { name: "departureDate", label: "Departure Date", type: "date", required: true },
      { name: "returnDate", label: "Return Date", type: "date", required: true },
      { name: "budget", label: "Budget", type: "number", required: false },
    ],
  }, "make a trip management app");
  assert.deepEqual(assembled.fields.map((field) => field.label), ["Trip Name", "Destination", "Departure Date", "Return Date", "Budget"]);
});

test("AI requests reserve room for input under the Groq TPM budget", () => {
  const messages = [{ role: "user", content: "x".repeat(4000) }];
  assert.ok(calculateCompletionTokenBudget(messages, 8000) < 6400);
});

test("structurally broken Flutter output is rejected before preview", () => {
  const broken = `
import 'package:flutter/material.dart';
void main() { runApp(const MaterialApp(home: Scaffold()));
${"// padding\n".repeat(60)}
`;
  assert.throws(
    () => assertValidFlutterCode(broken),
    /incomplete Flutter code/i
  );
});

test("obvious custom utilities never degrade into unrelated CRUD templates", () => {
  for (const prompt of ["simple calculator", "stopwatch app", "tic tac toe game"]) {
    const match = findBestTemplate(prompt);
    assert.equal(match.matched, false, prompt);
    assert.equal(match.routeHint, "custom_ai", prompt);
  }
});

test("app specifications normalize fields and enforce readable colors", () => {
  const result = normalizeAppSpec({
    appName: "Contacts",
    entity: "Contact",
    fields: [
      { name: "full name", label: "Full Name", type: "text" },
      { name: "full name", label: "Display Name", type: "unknown" },
      { name: "stage", label: "Stage", type: "select", options: ["New"] },
    ],
    theme: { background: "#FFFFFF", surface: "#FFFFFF", text: "#FFFFFF" },
  });

  assert.equal(result.valid, true);
  assert.equal(result.spec.specVersion, 2);
  assert.deepEqual(result.spec.fields.map((field) => field.name), ["fullName", "fullName2", "stage"]);
  assert.equal(result.spec.fields[1].type, "text");
  assert.equal(result.spec.fields[2].type, "text");
  assert.ok(contrastRatio(result.spec.theme.background, result.spec.theme.text) >= 4.5);
});
