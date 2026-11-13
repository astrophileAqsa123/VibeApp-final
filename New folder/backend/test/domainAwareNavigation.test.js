const test = require('node:test');
const assert = require('node:assert/strict');
const { getContextAwarePlan } = require('../services/contextAwareAppPlanner');
const { buildContextAwareFlutterApp } = require('../services/contextAwareFlutterFactory');

test('known app types get domain-aware bottom navigation instead of generic Records/Add', () => {
  const cases = [
    ['calorie tracker app', ['Dashboard','Food Log','Add Food','Weekly Analytics']],
    ['expense tracker app', ['Dashboard','Transactions','Add Transaction','Budgets']],
    ['habit tracker app', ['Today','My Habits','Add Habit','Progress']],
    ['booking appointment app', ['Services','Availability','Book Appointment','Upcoming Bookings']],
    ['shopping app', ['Home','Search','Cart','Orders']],
    ['attendance tracker app', ['Dashboard','Students','Mark Attendance','Reports']],
  ];
  for (const [prompt, labels] of cases) {
    const plan = getContextAwarePlan(prompt);
    assert.ok(plan, prompt);
    assert.deepEqual(plan.navigationPlan.primary.map((item) => item.label), labels, prompt);
    const code = buildContextAwareFlutterApp(plan).code;
    for (const label of labels) assert.match(code, new RegExp(`label:'${label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}'`));
    assert.doesNotMatch(code, /label:'Records'/, `${prompt} should not expose generic Records nav`);
    assert.doesNotMatch(code, /label:'Add'/, `${prompt} should not expose generic Add nav`);
  }
});

test('domain CTA does not coexist with generic Add New for known archetypes', () => {
  const calorie = getContextAwarePlan('calorie tracker app');
  assert.ok(calorie.screenBlueprint.some((screen) => screen.title === 'Add Food'));
  assert.ok(!calorie.screenBlueprint.some((screen) => screen.title === 'Add New'));
  const expense = getContextAwarePlan('expense tracker app');
  assert.ok(expense.screenBlueprint.some((screen) => screen.title === 'Add Transaction'));
  assert.ok(!expense.screenBlueprint.some((screen) => screen.title === 'Add New'));
});
