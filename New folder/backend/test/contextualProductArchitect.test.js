const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildContextAwareFlutterApp } = require('../services/contextAwareFlutterFactory');
const { buildArchitectBlueprint } = require('../services/ai/appArchitectAgent');
const { critiqueBlueprint } = require('../services/ai/blueprintCritic');

test('hospital gets Patient Doctor Admin with different dashboards and navigation', () => {
  const plan = getContextAwarePlan('hospital management app with role based login for appointments, prescriptions and billing');
  assert.ok(plan);
  assert.equal(plan.domain, 'hospital');
  assert.deepEqual(plan.roles.map(r=>r.label), ['Patient','Doctor','Admin']);
  assert.notDeepEqual(plan.navigationByRole.patient, plan.navigationByRole.doctor);
  assert.notDeepEqual(plan.roleDashboards.patient.cards, plan.roleDashboards.doctor.cards);
  assert.equal(plan.featurePolicies.charts, 'disabled');
  const code = buildContextAwareFlutterApp(plan).code;
  assert.match(code, /Patient/);
  assert.match(code, /Doctor/);
  assert.match(code, /Book Appointment/);
  assert.match(code, /Add Clinical Note/);
});

test('school gets domain roles and role-aware actions', () => {
  const plan = getContextAwarePlan('school management app with role based login for attendance assignments and grades');
  assert.deepEqual(plan.roles.map(r=>r.label), ['Student','Teacher','Admin']);
  assert.equal(plan.primaryActionsByRole.teacher[0], 'Mark Attendance');
  assert.notDeepEqual(plan.navigationByRole.student, plan.navigationByRole.teacher);
});

test('notes app has no forced analytics and keeps focused screen count', () => {
  const plan = getContextAwarePlan('simple notes app with tags and favorites');
  assert.equal(plan.featurePolicies.analytics, 'disabled');
  assert.equal(plan.featurePolicies.charts, 'disabled');
  assert.equal(plan.screenBlueprint.length, 7);
  assert.ok(!plan.screenBlueprint.some(s=>/analytics|reports/i.test(s.title)));
});

test('explicit roles override inferred hospital defaults', () => {
  const bp = buildArchitectBlueprint('hospital app roles: nurse, doctor, receptionist, admin');
  assert.deepEqual(bp.roles.map(r=>r.label), ['Nurse','Doctor','Receptionist','Admin']);
});

test('critic rejects analytics screen when analytics are disabled', () => {
  const bp = buildArchitectBlueprint('simple notes app');
  bp.screens.push({id:'analytics',label:'Analytics'});
  const result = critiqueBlueprint(bp);
  assert.equal(result.pass, false);
});

test('restaurant management gets customer staff manager roles and role nav', () => {
  const plan = getContextAwarePlan('restaurant management app with role based login, orders, tables and inventory');
  assert.ok(plan);
  assert.equal(plan.family, 'workspace');
  assert.deepEqual(plan.roles.map(r=>r.label), ['Customer','Staff','Manager']);
  assert.notDeepEqual(plan.navigationByRole.customer, plan.navigationByRole.staff);
  assert.equal(plan.primaryActionsByRole.customer[0], 'Place Order');
});

test('hotel, delivery, library, HR, real estate and support infer contextual roles', () => {
  const cases = [
    ['hotel management app with role based login', ['Guest','Receptionist','Manager']],
    ['courier delivery management system with permissions', ['Customer','Driver','Dispatcher']],
    ['library management app with user roles', ['Member','Librarian','Admin']],
    ['HR workforce management app role based', ['Employee','Manager','HR Admin']],
    ['real estate property management app with tenant portal', ['Tenant','Agent','Owner/Admin']],
    ['customer support help desk app with role based access', ['Customer','Support Agent','Support Admin']],
  ];
  for (const [prompt, expected] of cases) {
    const plan = getContextAwarePlan(prompt);
    assert.ok(plan, prompt);
    assert.deepEqual(plan.roles.map(r=>r.label), expected, prompt);
    assert.equal(plan.featurePolicies.roleBased, true, prompt);
  }
});

test('unknown explicit roles use universal role-aware workspace without manager/staff defaults', () => {
  const plan = getContextAwarePlan('build a compliance portal roles: auditor, reviewer, submitter with permissions');
  assert.ok(plan);
  assert.equal(plan.family, 'workspace');
  assert.deepEqual(plan.roles.map(r=>r.label), ['Auditor','Reviewer','Submitter']);
  for (const role of plan.roles) {
    assert.ok(plan.navigationByRole[role.id].length >= 3);
    assert.ok(plan.roleDashboards[role.id].cards.length >= 3);
  }
});

test('generated role workspace includes auth gate and role visibility plumbing', () => {
  const plan = getContextAwarePlan('pharmacy management app with role based login');
  const code = buildContextAwareFlutterApp(plan).code;
  assert.match(code, /class ContextAuthGate/);
  assert.match(code, /screenRoleVisibility/);
  assert.match(code, /Continue as/);
  assert.match(code, /Logout/);
  assert.doesNotMatch(code, /class DomainHomeShell/);
});

test('booking role app disables forced analytics and charts', () => {
  const plan = getContextAwarePlan('service booking platform with customer provider and admin roles');
  assert.ok(plan);
  assert.equal(plan.featurePolicies.analytics, 'disabled');
  assert.equal(plan.featurePolicies.charts, 'disabled');
});


test('recognized management systems automatically use domain-specific roles', () => {
  const cases = [
    ['hospital management app with appointments and billing', ['Patient','Doctor','Admin']],
    ['school management app for attendance and grades', ['Student','Teacher','Admin']],
    ['inventory management app with products and stock', ['Warehouse Staff','Supervisor','Admin']],
    ['restaurant management app for menu and orders', ['Customer','Staff','Manager']],
  ];
  for (const [prompt, roles] of cases) {
    const bp = buildArchitectBlueprint(prompt);
    assert.equal(bp.featurePolicies.roleBased, true, prompt);
    assert.deepEqual(bp.roles.map((role) => role.label), roles, prompt);
  }
});

test('role-based intent still activates contextual domain roles', () => {
  const hospital = buildArchitectBlueprint('hospital management app with role based login');
  assert.deepEqual(hospital.roles.map(r => r.label), ['Patient','Doctor','Admin']);
  assert.equal(hospital.featurePolicies.roleBased, true);
  const tenant = getContextAwarePlan('real estate app with tenant portal and agent access');
  assert.ok(tenant);
  assert.equal(tenant.featurePolicies.roleBased, true);
});

test('workspace create controls perform mutations instead of empty handlers', () => {
  const plan = getContextAwarePlan('hospital management app with role based login');
  const code = buildContextAwareFlutterApp(plan).code;
  assert.match(code, /workspaceCreatedRecords/);
  assert.match(code, /showWorkspaceCreateDialog/);
  assert.match(code, /createdRecordsFor\(def\.id\)\.insert/);
  assert.match(code, /void saveForm\(\)/);
  assert.doesNotMatch(code, /FilledButton\.icon\(onPressed:\(\)\{\},icon:const Icon\(Icons\.save_outlined\)/);
});

test('single-user workspace omits role gate while management workspace emits the safe structured gate', () => {
  const plan = getContextAwarePlan('simple notes app');
  assert.ok(plan);
  assert.equal(plan.featurePolicies.roleBased, false);
  assert.deepEqual(plan.roles, []);
  const code = buildContextAwareFlutterApp(plan).code;
  assert.match(code, /home: const ContextHomePage\(\),/);
  assert.doesNotMatch(code, /class ContextAuthGate/);

  const rolePlan = getContextAwarePlan('hospital management app with role based login for patient doctor and admin');
  assert.ok(rolePlan);
  assert.equal(rolePlan.featurePolicies.roleBased, true);
  const roleCode = buildContextAwareFlutterApp(rolePlan).code;
  assert.match(roleCode, /home: const ContextAuthGate\(\),/);
  assert.match(roleCode, /class ContextAuthGate/);
  assert.match(roleCode, /if \(generatedRoles\.isEmpty\) \{[\s\S]*return const ContextHomePage\(\);/);
  assert.match(roleCode, /generatedRoles\.map<Widget>\(\(role\) \{/);
  assert.doesNotMatch(roleCode, /generatedRoles\.map\(\(r\)=>Padding/);
});
