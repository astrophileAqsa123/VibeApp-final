const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildWorkspaceComponentSpec } = require('../services/ai/workspaceComponentSpec');
const { buildMultiEntityFlutterApp } = require('../services/multiEntityFlutterCompiler');

test('hospital management automatically uses contextual roles and component compiler spec', () => {
  const prompt = 'hospital management app';
  const plan = getContextAwarePlan(prompt);
  assert.equal(plan.family, 'workspace');
  assert.deepEqual(plan.roles.map((role) => role.label), ['Patient','Doctor','Admin']);
  assert.equal(plan.featurePolicies.roleBased, true);
  const spec = buildWorkspaceComponentSpec(plan, prompt);
  assert.equal(spec.authentication.enabled, true);
  assert.ok(spec.entities.length >= 2);
  assert.ok(spec.selectedCapabilities.includes('entity.crud'));
  assert.ok(spec.selectedCapabilities.includes('navigation.responsive'));
  const compiled = buildMultiEntityFlutterApp(spec);
  assert.match(compiled.code, /appAccentPalette/);
  assert.doesNotMatch(compiled.code, /GeneratedWorkspaceScreen/);
});

test('role-based hospital keeps domain roles but still uses component compiler', () => {
  const prompt = 'hospital app with role based login for patient, doctor and admin';
  const plan = getContextAwarePlan(prompt);
  const spec = buildWorkspaceComponentSpec(plan, prompt);
  assert.deepEqual(spec.roles.map((role) => role.name), ['Patient', 'Doctor', 'Admin']);
  assert.equal(spec.authentication.enabled, true);
  assert.ok(spec.selectedCapabilities.includes('auth.basic'));
  assert.ok(spec.selectedCapabilities.includes('security.rbac'));
  const compiled = buildMultiEntityFlutterApp(spec);
  assert.match(compiled.code, /Patient/);
  assert.match(compiled.code, /Doctor/);
  assert.match(compiled.code, /Admin/);
});

test('workspace form actions are not duplicated as separate entities', () => {
  const prompt = 'hospital management app';
  const spec = buildWorkspaceComponentSpec(getContextAwarePlan(prompt), prompt);
  const ids = spec.entities.map((entity) => entity.id);
  assert.ok(ids.includes('appointment'));
  assert.equal(ids.includes('bookAppointment'), false);
});
