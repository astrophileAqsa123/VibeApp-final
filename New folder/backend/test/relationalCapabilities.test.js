const test = require('node:test');
const assert = require('node:assert/strict');
const prompt = require('./fixtures/filmProduction');
const { planStructuredPrompt } = require('../services/ai/structuredPromptPlanner');
const { planApplication } = require('../services/ai/componentPlanner');
const { normalizeAppSpec } = require('../services/appSpec');
const { buildMultiEntityFlutterApp, dartString } = require('../services/multiEntityFlutterCompiler');
const { populateSeedData } = require('../services/ai/seedPlanner');

test('Film Production models foreign keys, many-to-many and attributed memberships', () => {
  const plan = planStructuredPrompt(prompt);
  assert.equal(plan.ready, true);
  const { spec } = plan;
  assert.equal(spec.entities.length, 10);
  const has = (source, target, type) => spec.relationships.some(r => r.sourceEntity === source && r.targetEntity === target && r.type === type);
  for (const [source, target] of [['project', 'scene'], ['location', 'scene'], ['project', 'shootDay'], ['location', 'shootDay'], ['shootDay', 'scene'], ['project', 'expense'], ['project', 'task'], ['person', 'task'], ['project', 'projectMembership'], ['person', 'projectMembership']]) assert.ok(has(source, target, 'oneToMany'), `${source} -> ${target}`);
  assert.ok(has('scene', 'prop', 'manyToMany'));
  assert.ok(has('character', 'scene', 'manyToMany'));
  assert.equal(spec.entities.find(e => e.id === 'scene').displayField, 'title');
  for (const r of spec.relationships.filter(r => r.targetField)) {
    const field = spec.entities.find(e => e.id === r.targetEntity).fields.find(f => f.id === r.targetField);
    assert.equal(field.referenceEntity, r.sourceEntity);
    assert.equal(field.type, 'reference');
  }
  assert.deepEqual(spec.views.map(v => v.type), ['calendar', 'budget']);
  const code = buildMultiEntityFlutterApp(spec).code;
  assert.match(code, /'projectId': 'project-1'/);
  assert.doesNotMatch(code, /Project Id 1|Olympus|Ares/);
  assert.match(code, /class CalendarScreen/);
  assert.match(code, /class BudgetSummary/);
});

test('normalization preserves reference metadata across repeated edits', () => {
  const first = planStructuredPrompt(prompt).spec;
  const second = normalizeAppSpec(first);
  assert.equal(second.valid, true);
  assert.deepEqual(second.spec.entities, first.entities);
  assert.deepEqual(second.spec.views, first.views);
});

test('custom spec paths do not prove a feature is compiled', async () => {
  const result = await planApplication('An unusual app', { complete: async () => ({
    requirements: [{ id: 'score', text: 'Custom scoring', implementedBy: ['custom.scoring'] }],
    appSpec: { entities: [{ id: 'entry', name: 'Entry', fields: [{ id: 'name' }] }], customCapabilities: [{ id: 'scoring' }] },
  }) });
  assert.equal(result.ready, false);
  assert.ok(result.missingCapabilities.some(c => c.id === 'scoring'));
});

test('edits receive current saved specification and never silently fall back', async () => {
  const currentSpec = planStructuredPrompt(prompt).spec;
  await assert.rejects(planApplication('Change the theme', { currentSpec, complete: async messages => {
    assert.match(messages[1].content, /CURRENT saved specification/);
    assert.match(messages[1].content, /projectMembership/);
    throw new Error('Planning unavailable');
  } }), /Planning unavailable/);
});

test('Dart strings escape user dollar interpolation', () => {
  assert.equal(dartString('Budget $100'), "'Budget \\$100'");
});

test('fallback retains unknown requirements as uncovered instead of claiming success', () => {
  const plan = planStructuredPrompt(prompt + ' Calculate weather-dependent insurance risk.');
  assert.equal(plan.ready, false);
  assert.ok(plan.requirements.some(r => r.status === 'uncovered' && /insurance/.test(r.text)));
});

test('an AI response that drops requested relationships is not accepted', async () => {
  const spec = planStructuredPrompt(prompt).spec;
  spec.relationships = spec.relationships.slice(0, 2);
  for (const entity of spec.entities) for (const field of entity.fields) {
    if (field.type === 'reference') { field.type = 'text'; delete field.referenceEntity; }
  }
  const result = await planApplication(prompt, { complete: async () => ({ appSpec: spec, requirements: [] }) });
  assert.equal(result.ready, false);
  assert.ok(result.missingCapabilities.some(c => /Requested relationship/.test(c.reason)));
});

test('explicit edit patches preserve unrelated relationships and previous views', async () => {
  const currentSpec = planStructuredPrompt(prompt).spec;
  const result = await planApplication('Make the theme purple', { currentSpec, complete: async () => ({ operations: [{ op: 'setTheme', value: { primary: '#673AB7' } }] }) });
  assert.equal(result.ready, true);
  assert.equal(result.spec.theme.primary, '#673AB7');
  assert.deepEqual(result.spec.relationships, currentSpec.relationships);
  assert.deepEqual(result.spec.views, currentSpec.views);
  assert.equal(result.spec.app.id, currentSpec.app.id);
});

test('batched AI sample data cannot overwrite generated IDs or references', async () => {
  const spec = planStructuredPrompt(prompt).spec;
  let calls = 0;
  const result = await populateSeedData(spec, async messages => {
    calls++;
    const request = JSON.parse(messages[1].content);
    assert.ok(request.entities.length <= 2);
    return Object.fromEntries(request.entities.map(e => [e.id, [0, 1, 2].map(() => ({ id: 'bad', projectId: 'missing', name: 'Fictional example', title: 'Evening shoot' }))]));
  });
  assert.equal(calls, 5);
  assert.equal(result.seedData.scene[0].id, 'scene-1');
  assert.equal(result.seedData.scene[0].projectId, 'project-1');
  assert.equal(result.seedData.scene[0].title, 'Evening shoot');
  assert.deepEqual(result.warnings, []);
});

test('sample provider failure returns valid seeds and a visible warning', async () => {
  const spec = planStructuredPrompt(prompt).spec;
  const result = await populateSeedData(spec, async () => { throw new Error('rate limited'); });
  assert.equal(result.seedData.scene[0].projectId, 'project-1');
  assert.equal(result.warnings.length, 1);
});
