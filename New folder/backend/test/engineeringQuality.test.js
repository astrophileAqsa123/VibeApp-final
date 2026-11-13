const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEngineeringReport, detectSecrets } = require('../services/engineeringQuality');
const { diffAppSpecs } = require('../services/versionDiff');
const { normalizeAndValidateAppSpec } = require('../services/appSpec');

test('role AppSpec normalizes safe signup and role dashboards', () => {
  const result = normalizeAndValidateAppSpec({
    appName: 'School', entity: 'Student', fields: [{ name: 'name', type: 'text' }],
    authentication: { enabled: true },
    roles: [{ name: 'Admin' }, { name: 'Teacher' }, { name: 'Student', selfSignup: true }],
  }, { storageMode: 'local' });
  assert.equal(result.valid, true);
  const admin = result.spec.roles.find((role) => role.name === 'Admin');
  assert.equal(admin.selfSignup, false);
  assert.equal(result.spec.dashboards.length, 3);
});

test('engineering report distinguishes static readiness from runtime build verification', () => {
  const spec = normalizeAndValidateAppSpec({ appName: 'Inventory', entity: 'Product', fields: [{ name: 'name', type: 'text' }] }, { storageMode: 'local' }).spec;
  const report = buildEngineeringReport({ prompt: 'Create inventory app', spec, code: "import 'package:flutter/material.dart';\nvoid main()=>runApp(const MaterialApp(home: Scaffold()));\n".repeat(5), storageMode: 'local' });
  assert.ok(report.score >= 60);
  assert.equal(report.stages.find((stage) => stage.id === 'build').status, 'pending_runtime');
  assert.equal(report.stages.find((stage) => stage.id === 'security').status, 'passed');
});

test('secret scanner catches server secrets', () => {
  assert.ok(detectSecrets("const service_role = 'secret';").length > 0);
});

test('AppSpec version diff reports field and UI changes', () => {
  const before = { uiPreset: 'minimal', entities: [{ id: 'product', fields: [{ id: 'name', label: 'Name' }] }], roles: [] };
  const after = { uiPreset: 'business', entities: [{ id: 'product', fields: [{ id: 'name', label: 'Name' }, { id: 'price', label: 'Price' }] }], roles: [] };
  const diff = diffAppSpecs(before, after);
  assert.equal(diff.available, true);
  assert.ok(diff.changes.some((item) => item.id === 'product.price' && item.type === 'added'));
  assert.ok(diff.changes.some((item) => item.id === 'uiPreset' && item.type === 'changed'));
});
