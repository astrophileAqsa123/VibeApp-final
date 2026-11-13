const test = require("node:test");
const assert = require("node:assert/strict");
const { buildFlutterCrudApp } = require("../services/exact500AppTemplates/uniqueFlutterCrudFactory");
const { buildOutline, isBalanced, matchBrace } = require("../services/codeOutline");
const { selectEditBlocks } = require("../services/codeEditContext");
const { editFlutterCodeWithGroqDiff, applyPatch, applyPatches, parsePatches, EditFailure } = require("../services/groqDiffEditService");
const { buildEditContext, isTokenLimitError, estimateTokens } = require("../services/ai/editContext");
const { planApplication, buildPlannerMessages } = require("../services/ai/componentPlanner");

const studentTemplate = {
  id: "student-management", appType: "student_management", appName: "Student Management", entity: "Student",
  domain: "education", layout: "card_stack", logo: "🎓",
  theme: { primary: "#2563EB", secondary: "#38BDF8", background: "#F8FAFC", surface: "#FFFFFF", text: "#172033", accent: "#10B981" },
  fields: [{ name: "name", label: "Name", type: "text", required: true }, { name: "course", label: "Course", type: "text" }],
  initialData: [],
};
const APP = buildFlutterCrudApp(studentTemplate); // ~100k chars: far larger than any model request allows

const respond = (json, finishReason = "stop") => ({ content: typeof json === "string" ? json : JSON.stringify(json), finishReason });

// --------------------------------------------------------------- outline --

test("outline ignores braces and quotes inside strings, interpolation and comments", () => {
  const code = [
    "class A {",
    "  Widget a() {",
    "    // a stray } and don't",
    "    final s = 'text with { brace and ${map['k']} and \\' quote';",
    "    return Text(\"}\");",
    "  }",
    "  Widget b() => Padding(child: Row(children: [Text('x')]));",
    "}",
    "void main() { runApp(const A()); }",
  ].join("\n");
  const outline = buildOutline(code);
  assert.deepEqual(outline.map((b) => `${b.parent}.${b.name}`), ["A.a", "A.b", ".main"]);
  const a = outline[0];
  assert.ok(code.slice(a.start, a.end).trim().endsWith("}"));
  assert.ok(isBalanced(code));
  assert.ok(!isBalanced("void f() { if (x) { }"));
  assert.equal(matchBrace("{ '}' }", 0), 7);
});

test("outline covers a real 100k-char app quickly with non-overlapping blocks", () => {
  const started = Date.now();
  const outline = buildOutline(APP);
  assert.ok(Date.now() - started < 1500, "outline should be fast");
  assert.ok(outline.length > 50);
  const sorted = outline.slice().sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i += 1) assert.ok(sorted[i].start >= sorted[i - 1].end, "blocks must not overlap");
  assert.ok(outline.some((b) => b.name === "_deleteRecord"));
});

// ------------------------------------------------------------- selection --

test("block selection sends the relevant function, not a blind window", () => {
  const del = selectEditBlocks(APP, "make the delete confirmation say are you sure");
  assert.ok(del.blocks.some((b) => b.name === "_deleteRecord"), del.blocks.map((b) => b.label).join("; "));
  const search = selectEditBlocks(APP, "change the search bar hint text");
  assert.ok(search.blocks.some((b) => b.name === "_buildSearchBar"), search.blocks.map((b) => b.label).join("; "));
  for (const sel of [del, search]) {
    const chars = sel.blocks.reduce((n, b) => n + b.text.length, 0);
    assert.ok(chars <= 6500, `selection too large: ${chars}`);
  }
});

test("a compiler error location selects exactly the failing function", () => {
  const outline = buildOutline(APP);
  const target = outline.find((b) => b.name === "_deleteRecord");
  const instruction = `lib/main.dart:${target.startLine + 5}:12: Error: The getter 'foo' isn't defined`;
  const sel = selectEditBlocks(APP, instruction);
  assert.equal(sel.blocks.length, 1);
  assert.equal(sel.blocks[0].name, "_deleteRecord");
});

test("selection honours a small budget by windowing very large blocks", () => {
  const sel = selectEditBlocks(APP, "change the dashboard", { budgetChars: 900, maxBlockChars: 900 });
  for (const block of sel.blocks) assert.ok(block.text.length <= 900);
});

// ------------------------------------------------------------- patching --

test("applyPatch does not expand $-patterns from replacement text", () => {
  const out = applyPatch("print('x');", "print('x');", "log('cost $& and $$ and ${price}');");
  assert.equal(out, "log('cost $& and $$ and ${price}');");
});

test("an ambiguous find patches the occurrence inside the shown block", () => {
  const code = "a();\n// -----\nb();\nfoo();\n// -----\nc();\nfoo();\n";
  const second = code.lastIndexOf("foo();");
  const out = applyPatch(code, "foo();", "bar();", [{ start: second - 3, end: second + 10 }]);
  assert.equal(out, "a();\n// -----\nb();\nfoo();\n// -----\nc();\nbar();\n");
});

test("several patches apply in order and report failures separately", () => {
  const result = applyPatches("one two three", [
    { find: "one", replace: "1" },
    { find: "missing", replace: "x" },
    { find: "three", replace: "3" },
  ]);
  assert.equal(result.code, "1 two 3");
  assert.equal(result.failed.length, 1);
});

test("parsePatches accepts patch lists, a single patch, fences, and rejects truncated JSON", () => {
  assert.deepEqual(parsePatches('{"patches":[{"find":"a","replace":"b"}]}'), [{ find: "a", replace: "b" }]);
  assert.deepEqual(parsePatches('{"find":"a","replace":"b"}'), [{ find: "a", replace: "b" }]);
  assert.deepEqual(parsePatches('```json\n{"patches":[{"find":"a","replace":"b"}]}\n```'), [{ find: "a", replace: "b" }]);
  assert.deepEqual(parsePatches('{"patches":[]}'), []);
  assert.equal(parsePatches('{"patches":[{"find":"a","repl'), null);
});

// ---------------------------------------------------------- edit service --

const DELETE_FIND = "Text('Delete ${AppProfile.entity}?'";

test("edit sends a small request and applies several patches to a 100k-char app", async () => {
  const sent = [];
  const result = await editFlutterCodeWithGroqDiff({
    instruction: "make the delete confirmation clearer",
    existingCode: APP,
    complete: async (messages, options) => {
      sent.push({ tokens: estimateTokens(messages), maxTokens: options.maxTokens });
      return respond({ patches: [
        { find: "title: Text('Delete ${AppProfile.entity}?'", replace: "title: Text('Remove this ${AppProfile.entity}?'" },
        { find: "child: const Text('Delete'),", replace: "child: const Text('Yes, remove'),\n" },
      ] });
    },
  });
  assert.equal(result.mode, "patch");
  assert.equal(result.patchCount, 2);
  assert.match(result.updatedCode, /Remove this \$\{AppProfile\.entity\}\?/);
  assert.match(result.updatedCode, /Yes, remove/);
  assert.ok(isBalanced(result.updatedCode));
  assert.equal(sent.length, 1);
  assert.ok(sent[0].tokens + sent[0].maxTokens <= 6500, `request too big: ${sent[0].tokens}+${sent[0].maxTokens}`);
  assert.ok(APP.length / 3 > 20000, "fixture really is far over any single-request limit");
});

test("a cut-off answer is retried with feedback and more output room", async () => {
  const calls = [];
  const result = await editFlutterCodeWithGroqDiff({
    instruction: "change the search bar hint text",
    existingCode: APP,
    complete: async (messages, options) => {
      calls.push({ prompt: messages[1].content, maxTokens: options.maxTokens });
      if (calls.length === 1) return respond('{"patches":[{"find":"hintText: \'Search ${AppProf', "length");
      return respond({ patches: [{ find: "hintText: 'Search ${AppProfile.entity.toLowerCase()} records...'", replace: "hintText: 'Find a ${AppProfile.entity.toLowerCase()}...'" }] });
    },
  });
  assert.equal(calls.length, 2);
  assert.match(calls[1].prompt, /cut off/);
  assert.ok(calls[1].maxTokens > calls[0].maxTokens);
  assert.match(result.updatedCode, /Find a \$\{AppProfile\.entity\.toLowerCase\(\)\}\.\.\./);
});

test("a provider 'request too large' error shrinks the code sent and retries", async () => {
  const sizes = [];
  const result = await editFlutterCodeWithGroqDiff({
    instruction: "change the search bar hint text",
    existingCode: APP,
    complete: async (messages) => {
      sizes.push(messages[1].content.length);
      if (sizes.length === 1) {
        const error = new Error("Request too large for model on tokens per minute (TPM): Limit 8000, Requested 9500");
        error.status = 413;
        throw error;
      }
      return respond({ patches: [{ find: "hintText: 'Search ", replace: "hintText: 'Look up " }] });
    },
  });
  assert.equal(sizes.length, 2);
  assert.ok(sizes[1] < sizes[0], `second request should be smaller (${sizes[0]} -> ${sizes[1]})`);
  assert.equal(result.shrinks, 1);
  assert.match(result.updatedCode, /Look up/);
});

test("when find-text keeps missing, the best function is rewritten whole and spliced in", async () => {
  const outline = buildOutline(APP);
  const target = outline.find((b) => b.name === "_buildSearchBar");
  const original = APP.slice(target.start, target.end);
  const rewritten = original.replace("'Search ${AppProfile.entity.toLowerCase()} records...'", "'Type to search...'");
  assert.notEqual(rewritten, original);
  let calls = 0;
  const result = await editFlutterCodeWithGroqDiff({
    instruction: "change the search bar hint text",
    existingCode: APP,
    complete: async (messages) => {
      calls += 1;
      if (/Return the full updated block/.test(messages[1].content)) return respond("```dart\n" + rewritten + "\n```");
      return respond({ patches: [{ find: "this text is not in the code", replace: "x" }] });
    },
  });
  assert.equal(calls, 3);
  assert.equal(result.mode, "block-rewrite");
  assert.match(result.updatedCode, /Type to search\.\.\./);
  assert.equal(result.updatedCode.length, APP.length - original.length + rewritten.length, "only the target function changed");
  assert.ok(isBalanced(result.updatedCode));
});

test("a patch that would unbalance the file is rejected, never returned", async () => {
  await assert.rejects(
    editFlutterCodeWithGroqDiff({
      instruction: "change the search bar hint text",
      existingCode: APP,
      complete: async () => respond({ patches: [{ find: "hintText: 'Search ", replace: "hintText: ((('Search " }] }),
    }),
    (error) => error instanceof EditFailure && /Try naming the screen or widget/.test(error.message),
  );
});

test("failure explains what to do instead of a vague error", async () => {
  await assert.rejects(
    editFlutterCodeWithGroqDiff({ instruction: "do something", existingCode: APP, complete: async () => respond({ patches: [] }) }),
    /Try naming the screen or widget/,
  );
});

// -------------------------------------------------- spec (planner) edits --

function bigSpec() {
  const names = ["student", "teacher", "classRoom", "subject", "exam", "grade", "attendance", "fee", "invoice", "libraryBook", "timetable", "event", "notice", "guardian"];
  const entities = names.map((id) => ({
    id, name: id[0].toUpperCase() + id.slice(1), pluralName: `${id}s`, displayField: "name",
    fields: Array.from({ length: 10 }, (_, i) => ({ id: `field${i}`, label: `Field number ${i}`, type: i % 4 === 0 ? "select" : "text", required: i === 0, searchable: true, filterable: i % 4 === 0, options: i % 4 === 0 ? ["Alpha", "Beta", "Gamma"] : [] })),
  }));
  return {
    app: { id: "school", name: "School", storageMode: "memory" }, theme: { primary: "#2563EB" }, entities,
    relationships: entities.slice(1).map((e, i) => ({ id: `r${i}`, type: "oneToMany", sourceEntity: "student", targetEntity: e.id, targetField: "studentId", onDelete: "restrict" })),
    views: [],
  };
}

test("edit context lists every entity and field id but details only what the request mentions", () => {
  const spec = bigSpec();
  const ctx = buildEditContext(spec, "Add a phone field to the teacher entity");
  assert.deepEqual(ctx.detailedEntities, ["teacher"]);
  const parsed = JSON.parse(ctx.text);
  assert.equal(Object.keys(parsed.otherEntities).length + parsed.detailedEntities.length, spec.entities.length);
  for (const entity of spec.entities) assert.ok(ctx.text.includes(entity.id));
  assert.ok(ctx.text.includes("field9"));
});

test("a large app's edit request fits where the full spec would not", () => {
  const spec = bigSpec();
  const fullTokens = estimateTokens({ app: spec.app, theme: spec.theme, entities: spec.entities, relationships: spec.relationships, views: spec.views });
  assert.ok(fullTokens > 7000, `fixture should exceed the old limit (${fullTokens})`);
  const messages = buildPlannerMessages("Add a phone field to the teacher entity", undefined, spec);
  assert.ok(estimateTokens(messages) < 3500, `edit request should be small, got ${estimateTokens(messages)}`);
});

test("edit context steps down a tier when asked or when over budget", () => {
  const spec = bigSpec();
  const t0 = buildEditContext(spec, "Add a phone field to the teacher entity", { tier: 0, maxChars: 1e9 });
  const t2 = buildEditContext(spec, "Add a phone field to the teacher entity", { tier: 2, maxChars: 1e9 });
  assert.ok(t2.chars < t0.chars);
  const auto = buildEditContext(spec, "Add a phone field to the teacher entity", { maxChars: 2500 });
  assert.ok(auto.tier >= 1);
});

test("token-limit detection is about request size, not transient rate limits", () => {
  assert.ok(isTokenLimitError({ status: 413, message: "Request too large for model" }));
  assert.ok(isTokenLimitError(new Error("Application context exceeds the planning token budget.")));
  assert.ok(!isTokenLimitError({ status: 429, message: "Rate limit reached on tokens per minute. Please try again in 4s" }));
  assert.ok(!isTokenLimitError(new Error("Invalid API key")));
});

test("planner edits retry with a smaller view of the app instead of failing", async () => {
  const spec = bigSpec();
  const tiers = [];
  const result = await planApplication("Change the theme to purple", {
    currentSpec: spec,
    complete: async (messages, options) => {
      tiers.push(messages[1].content.length);
      assert.ok(options.maxTokens <= 2000, "edits request a small output budget");
      if (tiers.length === 1) throw new Error("Application context exceeds the planning token budget. Reduce the request size.");
      return { operations: [{ op: "setTheme", value: { primary: "#673AB7" } }] };
    },
  });
  assert.equal(tiers.length, 2);
  assert.ok(tiers[1] <= tiers[0]);
  assert.equal(result.spec.theme.primary, "#673AB7");
  assert.equal(result.spec.entities.length, spec.entities.length, "no entity is lost by a smaller prompt");
});
