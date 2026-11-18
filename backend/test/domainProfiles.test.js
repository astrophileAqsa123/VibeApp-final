const test = require('node:test');
const assert = require('node:assert/strict');

const { generateExact500CrudTemplate, buildCompatibilityConfig } = require('../services/exact500AppTemplates');
const { resolveDomainProfile } = require('../services/exact500AppTemplates/domainProfiles');
const { checkFlutterCodeSyntax } = require('../services/exact500AppTemplates/flutterCodeSafety');

function generate(prompt) {
  const result = generateExact500CrudTemplate(prompt);
  assert.equal(result.success, true, prompt);
  assert.equal(checkFlutterCodeSyntax(result.code).valid, true, `${prompt} must compile cleanly`);
  return result;
}

const hasClass = (code, name) => new RegExp(`class ${name}\\b`).test(code);

test('each domain manages its own record type, not the prompt text', () => {
  const expected = {
    'hospital management system': ['Patient', 'Patients'],
    'doctor management app': ['Doctor', 'Doctors'],
    'library management system': ['Book', 'Books'],
    'pharmacy management system': ['Medicine', 'Medicines'],
    'student management app': ['Student', 'Students'],
    'gym management app': ['Member', 'Members'],
    'employee management system': ['Employee', 'Employees'],
    'property management app': ['Property', 'Properties'],
  };
  for (const [prompt, [entity, plural]] of Object.entries(expected)) {
    const config = buildCompatibilityConfig(prompt);
    assert.equal(config.entity, entity, prompt);
    assert.equal(config.entityPlural, plural, prompt);
    assert.equal(config.cta, `Add ${entity}`, prompt);
    assert.doesNotMatch(JSON.stringify(config.fields), /Management/i, `${prompt}: no prompt text in field labels`);
  }
});

test('generated code never builds labels like "Add Hospital Management"', () => {
  for (const prompt of ['hospital management system', 'library management system', 'inventory management system']) {
    const { code } = generate(prompt);
    assert.doesNotMatch(code, /Add (Hospital|Library|Inventory) Management/i, prompt);
    assert.doesNotMatch(code, /(Hospital|Library|Inventory) Management Name/i, prompt);
  }
});

test('hospital and library apps have no charts or calendar; expense tracker does', () => {
  for (const prompt of ['hospital management system', 'library management system', 'pharmacy management system']) {
    const { code } = generate(prompt);
    assert.equal(hasClass(code, 'VibeAnalyticsPage'), false, `${prompt} must not show a graph`);
    assert.equal(hasClass(code, 'VibeCalendarPage'), false, prompt);
  }
  const expense = generate('expense tracker app').code;
  assert.equal(hasClass(expense, 'VibeAnalyticsPage'), true);
  assert.match(expense, /static const String amountField = 'amount'/);
});

test('domain fields come from the record type', () => {
  const hospital = buildCompatibilityConfig('hospital management system').fields.map((f) => f.label);
  assert.ok(hospital.includes('Diagnosis') && hospital.includes('Assigned Doctor'));
  const library = buildCompatibilityConfig('library management system').fields.map((f) => f.label);
  assert.ok(library.includes('Author') && library.includes('ISBN'));
  assert.ok(!library.includes('Diagnosis'));
});

test('asking for charts or a calendar in the prompt turns the tab on, "no charts" turns it off', () => {
  assert.equal(resolveDomainProfile('hospital app with charts').modules.includes('analytics'), true);
  assert.equal(resolveDomainProfile('hospital app with calendar').modules.includes('calendar'), true);
  assert.equal(resolveDomainProfile('expense tracker without charts').modules.includes('analytics'), false);
});

test('tabs only read fields the record type really has', () => {
  const profile = resolveDomainProfile('library management with charts and calendar');
  // Books have no date field, so the calendar tab is dropped even when requested.
  assert.equal(profile.modules.includes('calendar'), false);
  assert.equal(profile.modules.includes('analytics'), true);
});

test('unknown domains derive a short record type and stay minimal', () => {
  const profile = resolveDomainProfile('telescope booth management system');
  assert.equal(profile.key, 'generic');
  assert.doesNotMatch(profile.entity, /management|system/i);
  assert.deepEqual(profile.modules, ['dashboard', 'records', 'profile', 'settings']);
});

test('output is deterministic', () => {
  assert.equal(generate('hospital management system').code, generate('hospital management system').code);
});
