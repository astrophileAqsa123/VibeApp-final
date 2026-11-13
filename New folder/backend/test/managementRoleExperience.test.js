const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildWorkspaceComponentSpec } = require('../services/ai/workspaceComponentSpec');
const { buildMultiEntityFlutterApp } = require('../services/multiEntityFlutterCompiler');

const CASES = [
  ['hospital management system', ['Patient','Doctor','Admin']],
  ['school management system', ['Student','Teacher','Admin']],
  ['restaurant management system', ['Customer','Staff','Manager']],
  ['hotel management system', ['Guest','Receptionist','Manager']],
  ['inventory management system', ['Warehouse Staff','Supervisor','Admin']],
  ['library management system', ['Member','Librarian','Admin']],
  ['pharmacy management system', ['Customer','Pharmacist','Admin']],
  ['project management system', ['Team Member','Project Manager','Workspace Admin']],
  ['crm management system', ['Sales Rep','Sales Manager','Admin']],
];

test('recognized management systems get domain-specific roles, dashboards, access and actions', () => {
  for (const [prompt, expectedRoles] of CASES) {
    const plan = getContextAwarePlan(prompt);
    assert.ok(plan, prompt);
    assert.equal(plan.featurePolicies.roleBased, true, prompt);
    assert.deepEqual(plan.roles.map((role) => role.label), expectedRoles, prompt);
    const dashboardSignatures = plan.roles.map((role) => JSON.stringify(plan.roleDashboards[role.id]?.cards || []));
    assert.equal(new Set(dashboardSignatures).size, expectedRoles.length, `${prompt} dashboards must differ`);
    const spec = buildWorkspaceComponentSpec(plan, prompt);
    const cfg = spec.workspaceRoleConfig;
    assert.ok(cfg, prompt);
    for (const role of expectedRoles) {
      assert.ok((cfg.entityAccess[role] || []).length >= 2, `${prompt} ${role} access`);
      assert.ok((cfg.dashboardCards[role] || []).length >= 3, `${prompt} ${role} dashboard cards`);
      assert.ok(cfg.primaryActions[role]?.label, `${prompt} ${role} primary action`);
    }
    const compiled = buildMultiEntityFlutterApp(spec);
    assert.match(compiled.code, /roleEntityAccess/);
    assert.match(compiled.code, /roleDashboardCards/);
    assert.match(compiled.code, /roleEntityActions/);
    assert.match(compiled.code, /Your dashboard only shows the modules and actions relevant to this role/);
  }
});

test('hospital role functionality is separated by role', () => {
  const prompt = 'hospital management system';
  const plan = getContextAwarePlan(prompt);
  const spec = buildWorkspaceComponentSpec(plan, prompt);
  const cfg = spec.workspaceRoleConfig;
  assert.deepEqual(cfg.entityAccess.Patient, ['appointment','medicalRecord','prescription']);
  assert.ok(cfg.entityAccess.Doctor.includes('clinicalNote'));
  assert.ok(cfg.entityAccess.Doctor.includes('patient'));
  assert.ok(cfg.entityAccess.Admin.includes('doctor'));
  assert.ok(cfg.entityAccess.Admin.includes('department'));
  assert.equal(cfg.primaryActions.Patient.entityId, 'appointment');
  assert.equal(cfg.primaryActions.Doctor.entityId, 'clinicalNote');
  assert.equal(cfg.primaryActions.Admin.entityId, 'doctor');
  assert.deepEqual(cfg.entityActions['Patient::prescription'], ['read']);
  assert.ok(cfg.entityActions['Doctor::clinicalNote'].includes('create'));
  assert.ok(cfg.entityActions['Admin::doctor'].includes('delete'));
});

test('non-management single-user apps are not forced into roles', () => {
  for (const prompt of ['simple notes app', 'calorie tracker app', 'personal expense tracker']) {
    const plan = getContextAwarePlan(prompt);
    if (!plan) continue;
    assert.equal(plan.featurePolicies.roleBased, false, prompt);
    assert.deepEqual(plan.roles, [], prompt);
  }
});
