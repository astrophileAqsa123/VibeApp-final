const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeTemplate, buildFlutterCrudApp } = require('../services/exact500AppTemplates/uniqueFlutterCrudFactory');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildContextAwareFlutterApp } = require('../services/contextAwareFlutterFactory');
const { normalizeAppSpec } = require('../services/appSpec/normalize');
const { buildMultiEntityFlutterApp } = require('../services/multiEntityFlutterCompiler');
const { checkFlutterCodeSyntax } = require('../services/exact500AppTemplates/flutterCodeSafety');

test('role definitions automatically enable auth while keeping splash and mobile bottom navigation', () => {
  const template = {
    appName: 'School Portal', entity: 'Student', domain: 'Education',
    features: { roles: ['Admin', 'Teacher', 'Student'], hasSplash: true, allowSignup: true },
  };
  const safe = sanitizeTemplate(template);
  assert.equal(safe.features.hasAuth, true);
  assert.equal(safe.features.hasSplash, true);
  const code = buildFlutterCrudApp(template);
  assert.equal(checkFlutterCodeSyntax(code).valid, true);
  assert.match(code, /home: AppProfile\.hasSplash \? const VibeSplashPage\(\)/);
  assert.match(code, /AppProfile\.hasAuth \? const VibeAuthGate\(\)/);
  assert.match(code, /class VibeRoleLoginPage/);
  assert.match(code, /class VibeRoleSignupPage/);
  assert.match(code, /bottomNavigationBar: wide \? null : NavigationBar/);
});

test('context-aware apps launch through splash and expose 12-screen navigation through bottom nav and More', () => {
  const plan = getContextAwarePlan('calorie tracker app');
  const code = buildContextAwareFlutterApp(plan).code;
  assert.equal(checkFlutterCodeSyntax(code).valid, true);
  assert.match(code, /home: const DomainSplashPage\(\)/);
  assert.match(code, /class DomainHomeShell/);
  assert.match(code, /bottomNavigationBar:NavigationBar/);
  assert.match(code, /class DomainMorePage/);
  assert.match(code, /class DomainDrawer/);
  assert.ok(plan.screenBlueprint.length >= 12);
});

test('multi-entity role apps compile splash, login, role selection, signup and role-aware navigation', () => {
  const raw = {
    app: { name: 'School Manager' }, features: { roleBasedAuth: true, hasSplash: true },
    roles: ['Admin', 'Teacher', 'Student'], authentication: { allowSignup: true },
    entities: [
      { id: 'student', name: 'Student', pluralName: 'Students', fields: [{ id: 'name', label: 'Name', type: 'text' }] },
      { id: 'course', name: 'Course', pluralName: 'Courses', fields: [{ id: 'title', label: 'Title', type: 'text' }] },
    ],
  };
  const normalizedResult = normalizeAppSpec(raw);
  const spec = normalizedResult.spec || normalizedResult;
  assert.equal(spec.authentication.enabled, true);
  const code = buildMultiEntityFlutterApp(spec).code;
  assert.equal(checkFlutterCodeSyntax(code).valid, true);
  assert.match(code, /class AppLaunchSplash/);
  assert.match(code, /class MultiRoleLoginPage/);
  assert.match(code, /class RoleSelectionPage/);
  assert.match(code, /Choose your workspace/);
  assert.match(code, /class MultiRoleSignupPage/);
  assert.match(code, /bottomNavigationBar: wide \? null : Builder/);
  assert.doesNotMatch(code, /DropdownButtonFormField<String>\(value:role,decoration:const InputDecoration\(labelText:'Role'/);
  assert.match(code, /if \(!credentialsAccepted\)/);
  assert.match(code, /if \(activeRole == null\)/);
});
