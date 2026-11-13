const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildContextAwareFlutterApp } = require('../services/contextAwareFlutterFactory');

function balanced(text, open, close) {
  let depth = 0;
  for (const ch of text) {
    if (ch === open) depth += 1;
    else if (ch === close) depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

test('hospital management uses valid role-specific navigation and safe role UI', () => {
  const plan = getContextAwarePlan('hospital management app');
  assert.equal(plan.featurePolicies.roleBased, true);
  assert.deepEqual(plan.roles.map((role) => role.label), ['Patient','Doctor','Admin']);
  assert.deepEqual(plan.appBlueprint.navigation.byRole.patient, ['home','appointments','records','prescriptions','profile']);
  assert.deepEqual(plan.appBlueprint.navigation.byRole.doctor, ['today','patients','appointments','clinicalNotes','prescriptions']);
  const code = buildContextAwareFlutterApp(plan).code;
  assert.match(code, /generatedRoles\.map<Widget>/);
  assert.doesNotMatch(code, /generatedRoles\.map\(\(r\)=>Padding/);
  assert.doesNotMatch(code, /\$\{role \?\? 'User'\} •/);
  assert.match(code, /selected\.clamp\(0,nav\.length-1\)\.toInt\(\)/);
  assert.match(code, /Medical document|Clinical document/);
  assert.ok(balanced(code, '(', ')'));
  assert.ok(balanced(code, '[', ']'));
  assert.ok(balanced(code, '{', '}'));
});

test('role hospital keeps contextual roles and safe role gate', () => {
  const plan = getContextAwarePlan('hospital management app with role based login for Patient, Doctor and Admin');
  assert.equal(plan.featurePolicies.roleBased, true);
  assert.deepEqual(plan.roles.map(r => r.label), ['Patient','Doctor','Admin']);
  const code = buildContextAwareFlutterApp(plan).code;
  assert.match(code, /generatedRoles\.map<Widget>\(\(role\) \{/);
  assert.doesNotMatch(code, /generatedRoles\.map\(\(r\)=>Padding/);
  assert.ok(balanced(code, '(', ')'));
});

test('notes stays non-role and analytics-free', () => {
  const plan = getContextAwarePlan('simple notes app');
  assert.equal(plan.featurePolicies.roleBased, false);
  assert.equal(plan.featurePolicies.analytics, 'disabled');
  assert.deepEqual(plan.navigationPlan.primary.map(x=>x.id), ['notes','search','favorites','archive']);
});
