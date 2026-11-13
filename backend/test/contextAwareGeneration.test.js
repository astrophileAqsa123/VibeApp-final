const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan, classifyAppArchetype, screenBlueprintFor } = require('../services/contextAwareAppPlanner');
const { buildContextAwareFlutterApp } = require('../services/contextAwareFlutterFactory');
const { checkFlutterCodeSyntax, sanitizeGeneratedFlutterCode } = require('../services/exact500AppTemplates/flutterCodeSafety');

function build(prompt) {
  const plan = getContextAwarePlan(prompt);
  assert.ok(plan, `Expected a contextual plan for: ${prompt}`);
  const result = buildContextAwareFlutterApp(plan);
  assert.equal(checkFlutterCodeSyntax(result.code).valid, true, prompt);
  return { plan, code: result.code };
}

test('context planner recognizes broad functional app families', () => {
  const cases = [
    ['calorie calculating app', 'calorie_tracker'],
    ['personal expense tracker', 'expense_tracker'],
    ['daily habit tracker', 'habit_tracker'],
    ['water intake tracker', 'hydration_tracker'],
    ['gym workout log', 'workout_tracker'],
    ['BMI calculator', 'bmi_calculator'],
    ['loan calculator', 'loan_calculator'],
    ['simple calculator', 'calculator'],
    ['unit converter', 'unit_converter'],
    ['pomodoro focus timer', 'pomodoro'],
    ['stopwatch app', 'timer_stopwatch'],
    ['quiz app', 'quiz'],
    ['appointment booking app', 'booking'],
    ['ecommerce shopping app', 'shopping_catalog'],
  ];
  for (const [prompt, expected] of cases) {
    assert.equal(classifyAppArchetype(prompt)?.id, expected, prompt);
  }
});

test('calorie tracker is functional and contextual instead of generic CRUD', () => {
  const { code } = build('build a calories calculating app');
  assert.match(code, /daily|Today/i);
  assert.match(code, /remaining of/);
  assert.match(code, /Weekly calories/);
  assert.match(code, /Food log/);
  assert.match(code, /mealTotal/);
  assert.match(code, /LinearProgressIndicator/);
  assert.doesNotMatch(code, /RecordDetailsPage/);
});

test('finance tracker includes totals, balance, categories and transaction flow', () => {
  const { code } = build('build a personal expense tracker');
  assert.match(code, /Available balance/);
  assert.match(code, /Spending by category/);
  assert.match(code, /Recent transactions/);
  assert.match(code, /Add transaction/);
  assert.doesNotMatch(code, /'\$\$\{/i, 'must not emit invalid Dart currency interpolation');
  assert.match(code, /<double>\[food,travel,bills,other,1\.0\]/, 'chart max list must be explicitly double');
});

test('calculator families generate actual calculation behavior', () => {
  const basic = build('build a calculator app').code;
  assert.match(basic, /stored/);
  assert.match(basic, /if\(op=='\+'/);
  assert.match(basic, /GridView\.builder/);

  const bmi = build('BMI calculator').code;
  assert.match(bmi, /Weight \(kg\)/);
  assert.match(bmi, /Height \(cm\)/);
  assert.match(bmi, /a \/ \(\(b \/ 100\)/);
});

test('recognized management systems infer domain roles while unknown management prompts keep the legacy fallback', () => {
  const school = getContextAwarePlan('student management app with name age and phone');
  assert.ok(school);
  assert.equal(school.domain, 'school');
  assert.deepEqual(school.roles.map((role) => role.label), ['Student','Teacher','Admin']);
  assert.equal(school.featurePolicies.roleBased, true);
  const inventory = getContextAwarePlan('inventory management for products and suppliers');
  assert.ok(inventory);
  assert.equal(inventory.domain, 'inventory');
  assert.equal(inventory.featurePolicies.roleBased, true);
  assert.deepEqual(inventory.roles.map((role) => role.label), ['Warehouse Staff','Supervisor','Admin']);
  assert.equal(getContextAwarePlan('customer CRM with company and phone'), null);
});

test('all contextual recipes avoid APIs rejected by the production Flutter worker', () => {
  const prompts = [
    'calorie calculating app',
    'personal expense tracker',
    'daily habit tracker',
    'water intake tracker',
    'gym workout log',
    'attendance tracker',
    'BMI calculator',
    'loan calculator',
    'simple calculator',
    'unit converter',
    'pomodoro focus timer',
    'stopwatch app',
    'quiz app',
    'appointment booking app',
    'ecommerce shopping app',
  ];
  for (const prompt of prompts) {
    const { code } = build(prompt);
    assert.doesNotMatch(code, /\.withValues\(/, `${prompt} must avoid Color.withValues`);
    assert.doesNotMatch(code, /DropdownButtonFormField(?:<[^>]+>)?\([^)]*initialValue:/s, `${prompt} must avoid DropdownButtonFormField initialValue`);
    assert.doesNotMatch(code, /'\$\$\{/, `${prompt} must avoid invalid literal-dollar interpolation`);
  }
});


test('calorie chart data is explicitly double-safe for Flutter web builds', () => {
  const { code } = build('build a calories calculating app');
  assert.match(code, /final week=<double>\[/);
  assert.match(code, /maxValue:2400\.0/);
  assert.doesNotMatch(code, /final week=\[1420\.0,1780,/);
});


test('SimpleBars accepts List<num> so mixed numeric chart data cannot break generation', () => {
  const { code } = build('daily habit tracker');
  assert.match(code, /final List<num> values;/);
});


test('known archetypes produce complete multi-screen blueprints and wired routes', () => {
  const prompts = [
    'calorie tracker app', 'expense tracker app', 'habit tracker app', 'workout tracker app',
    'attendance tracker app', 'booking app', 'quiz app', 'shopping app', 'loan calculator', 'pomodoro timer'
  ];
  for (const prompt of prompts) {
    const { plan, code } = build(prompt);
    assert.ok(Array.isArray(plan.screenBlueprint), `${prompt} should have a screen blueprint`);
    assert.ok(plan.screenBlueprint.length >= 12 && plan.screenBlueprint.length <= 14, `${prompt} should have 12-14 meaningful screens`);
    assert.match(code, /class DomainDrawer/);
    assert.match(code, /class GeneratedFeatureScreen/);
    for (const screen of plan.screenBlueprint.slice(1)) {
      assert.match(code, new RegExp(`/${screen.id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`), `${prompt} route ${screen.id}`);
      assert.match(code, new RegExp(screen.title.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), `${prompt} screen ${screen.title}`);
    }
  }
});

test('finance uses a raw Dart dollar literal that survives JavaScript generation', () => {
  const { code } = build('personal expense tracker');
  assert.match(code, /r'\$' \+ balance\.toStringAsFixed/);
  assert.match(code, /r'\$' \+ income\.toStringAsFixed/);
  assert.doesNotMatch(code, /Text\('\$' \+/);
});

test('compatibility sanitizer is deterministic and idempotent for known worker failures', () => {
  const input = "final a = Text('$' + total.toString());\nfinal c = Colors.blue.withValues(alpha: .2);\nfinal d = DropdownButtonFormField<String>(initialValue: choice, items: const [], onChanged: (_) {});\nfinal b = SimpleBars(values:[1,2],labels:const ['A','B'],maxValue:100);";
  const once = sanitizeGeneratedFlutterCode(input);
  const twice = sanitizeGeneratedFlutterCode(once);
  assert.equal(twice, once);
  assert.match(once, /r'\$'/);
  assert.match(once, /withOpacity\(\.2\)/);
  assert.match(once, /DropdownButtonFormField<String>\(value: choice/);
  assert.match(once, /maxValue:100\.0/);
});


test('detailed archetypes include domain-required screens instead of padded generic pages', () => {
  const cases = [
    ['calorie tracker app', ['Add Food','Food Log','Nutrition Summary','Macro Goals','Weight Progress','Recipes','Meal Reminders']],
    ['expense tracker app', ['Transactions','Budgets','Categories','Accounts & Wallets','Savings Goals','Bills & Subscriptions','Reports']],
    ['habit tracker app', ['My Habits','Routine Planner','Habit Calendar','Habit Insights','Achievements','Reminders']],
    ['workout tracker app', ['Workout Plans','Exercise Library','Start Workout','Workout History','Personal Records','Body Metrics']],
    ['booking app', ['Service Categories','Providers','Availability','Booking Confirmation','Upcoming Bookings','Favorite Providers']],
    ['quiz app', ['Quiz Sets','Take Quiz','Review Answers','Leaderboard','Achievements','Saved Quizzes']],
    ['shopping app', ['Search','Products','Product Detail','Favorites','Cart','Checkout','Orders','Order Detail']],
    ['loan calculator', ['Inputs','Results','Compare Results','Charts','Formula Guide','Examples','Saved Results']],
    ['unit converter', ['Quick Convert','Unit Categories','Common Conversions','Custom Units','Conversion Tables','Saved Conversions']],
    ['pomodoro timer', ['Presets','Focus Modes','Sessions','Statistics','Focus Goals','Focus Schedule','Reminders','Achievements']],
  ];
  for (const [prompt, titles] of cases) {
    const plan = getContextAwarePlan(prompt);
    assert.ok(plan, prompt);
    assert.ok(plan.screenBlueprint.length >= 12 && plan.screenBlueprint.length <= 14, `${prompt} screen count`);
    const actual = new Set(plan.screenBlueprint.map((s) => s.title));
    for (const title of titles) assert.ok(actual.has(title), `${prompt} missing ${title}`);
  }
});
