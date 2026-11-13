const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildWorkspaceComponentSpec } = require('../services/ai/workspaceComponentSpec');
const { buildMultiEntityFlutterApp } = require('../services/multiEntityFlutterCompiler');
const { checkFlutterCodeSyntax } = require('../services/exact500AppTemplates/flutterCodeSafety');

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

test('management apps follow splash -> login -> role selection -> role dashboard', () => {
  for (const [prompt, roles] of CASES) {
    const plan = getContextAwarePlan(prompt);
    assert.equal(plan.featurePolicies.roleBased, true, prompt);
    assert.deepEqual(plan.roles.map((r) => r.label), roles, prompt);
    const spec = buildWorkspaceComponentSpec(plan, prompt);
    assert.equal(spec.authentication.enabled, true, prompt);
    const code = buildMultiEntityFlutterApp(spec).code;
    assert.equal(checkFlutterCodeSyntax(code).valid, true, prompt);
    assert.match(code, /class AppLaunchSplash/, prompt);
    assert.match(code, /class MultiRoleLoginPage/, prompt);
    assert.match(code, /class RoleSelectionPage/, prompt);
    assert.match(code, /if \(!credentialsAccepted\)/, prompt);
    assert.match(code, /if \(activeRole == null\)/, prompt);
    assert.match(code, /return AppShell\(store:widget\.store, activeRole:activeRole/, prompt);
    assert.doesNotMatch(code, /DropdownButtonFormField<String>\(value:role,decoration:const InputDecoration\(labelText:'Role'/, prompt);
    for (const role of roles) {
      assert.ok((spec.workspaceRoleConfig.dashboardCards[role] || []).length >= 3, `${prompt}: ${role} dashboard`);
      assert.ok((spec.workspaceRoleConfig.entityAccess[role] || []).length >= 2, `${prompt}: ${role} access`);
      assert.ok(spec.workspaceRoleConfig.primaryActions[role]?.label, `${prompt}: ${role} action`);
    }
  }
});

test('ordinary single-user apps remain outside role auth flow', () => {
  for (const prompt of ['simple notes app','calorie tracker app','personal expense tracker']) {
    const plan = getContextAwarePlan(prompt);
    if (!plan) continue;
    assert.equal(plan.featurePolicies.roleBased, false, prompt);
    assert.deepEqual(plan.roles, [], prompt);
  }
});
