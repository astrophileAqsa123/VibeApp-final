const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { generateExact500CrudTemplate } = require('../services/exact500AppTemplates');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { normalizeAppSpec } = require('../services/appSpec');
const { buildMultiEntityFlutterApp } = require('../services/multiEntityFlutterCompiler');
const { checkFlutterCodeSyntax } = require('../services/exact500AppTemplates/flutterCodeSafety');

const UNIVERSAL_TITLES = [
  'Dashboard', 'Quick Create', 'Categories', 'Calendar', 'Analytics', 'Reports',
  'Favorites', 'Activity', 'Notifications', 'Profile', 'Settings',
];

test('generic component CRUD apps expose the universal 12-screen product shell', () => {
  const result = generateExact500CrudTemplate('student management app with name age phone');
  assert.equal(result.success, true);
  assert.equal(checkFlutterCodeSyntax(result.code).valid, true);
  assert.match(result.code, /class VibeModulePage extends StatefulWidget/);
  assert.doesNotMatch(result.code, /Workspace actions/);
  for (const signature of ['Create a new ', '7-day activity', 'Unread only', 'Pinned workspace', 'Weekly summary']) {
    assert.match(result.code, new RegExp(signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const title of UNIVERSAL_TITLES) {
    assert.match(result.code, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${title}`);
  }
  assert.match(result.code, /label: AppProfile\.entity \+ 's'/);
});

test('multi-entity component compiler expands primary navigation to at least 12 screens', () => {
  const normalized = normalizeAppSpec({
    app: { id: 'library', name: 'Library Operations', storageMode: 'memory' },
    entities: [
      { id: 'book', name: 'Book', fields: [{ id: 'title', label: 'Title', required: true }] },
      { id: 'author', name: 'Author', fields: [{ id: 'name', label: 'Name', required: true }] },
    ],
  });
  assert.equal(normalized.valid, true, normalized.errors.join('; '));
  const compiled = buildMultiEntityFlutterApp(normalized.spec);
  assert.equal(checkFlutterCodeSyntax(compiled.code).valid, true);
  assert.match(compiled.code, /12 - \(1 \+ entityDefinitions\.length\)/);
  assert.match(compiled.code, /class UniversalFeatureScreen extends StatelessWidget/);
  for (const signature of ['Choose what to create', 'Records by module', 'Pinned modules', 'Generated app guide']) {
    assert.match(compiled.code, new RegExp(signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(compiled.code, /universalFeatureScreens/);
});

test('context-aware component families keep 12-14 domain screens', () => {
  const prompts = [
    'calorie tracker', 'expense tracker', 'habit tracker', 'water tracker', 'workout tracker',
    'attendance tracker', 'BMI calculator', 'loan calculator', 'unit converter', 'pomodoro timer',
    'quiz app', 'booking app', 'shopping app',
  ];
  for (const prompt of prompts) {
    const plan = getContextAwarePlan(prompt);
    assert.ok(plan, prompt);
    assert.ok(plan.screenBlueprint.length >= 12 && plan.screenBlueprint.length <= 14, `${prompt}: ${plan.screenBlueprint.length}`);
  }
});

test('Groq custom generation uses contextual screen count instead of a fixed quota', () => {
  const source = fs.readFileSync(path.join(__dirname, '../services/aiService.js'), 'utf8');
  assert.match(source, /enough meaningful primary screens\/routes/);
  assert.match(source, /Screen count must be driven by domain complexity, not a fixed quota/);
  assert.doesNotMatch(source, /at least 12 meaningful primary screens\/routes/);
});
