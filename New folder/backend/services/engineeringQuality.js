const { normalizeAndValidateAppSpec, evaluateRequirementCoverage } = require('./appSpec');
const { auditCompilerSpec } = require('./appSpec/compilerCapabilities');
const { normalizeUiPreset } = require('./uiPresets');

function uniq(items) { return [...new Set((items || []).filter(Boolean))]; }

function detectSecrets(code = '') {
  const text = String(code || '');
  const findings = [];
  const rules = [
    [/service[_ -]?role/i, 'Possible Supabase service-role secret reference'],
    [/sk_live_[A-Za-z0-9_-]+/i, 'Possible live payment secret'],
    [/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i, 'Private key embedded in generated code'],
    [/database[_ -]?password/i, 'Possible database password reference'],
  ];
  for (const [pattern, message] of rules) if (pattern.test(text)) findings.push(message);
  return findings;
}

function codeChecks(code = '', storageMode = 'local') {
  const text = String(code || '');
  const checks = [
    { id: 'code-present', label: 'Generated Dart code exists', pass: text.trim().length > 200 },
    { id: 'material-app', label: 'Flutter application root detected', pass: /MaterialApp|CupertinoApp/.test(text) },
    { id: 'no-dangerous-process', label: 'No generated shell/process execution', pass: !/dart:io[\s\S]{0,500}\bProcess\.(run|start)|\bProcess\.(run|start)/.test(text) },
    { id: 'no-secret-patterns', label: 'No high-risk server secret patterns', pass: detectSecrets(text).length === 0 },
  ];
  if (storageMode === 'supabase') {
    checks.push({ id: 'supabase-client', label: 'Supabase client integration detected', pass: /supabase_flutter|Supabase\.initialize/.test(text) });
  }
  return checks;
}

function capabilityMatrix({ prompt = '', spec = null, storageMode = 'local' } = {}) {
  const text = String(prompt || '').toLowerCase();
  const hasAuth = Boolean(spec?.authentication?.enabled || /\b(login|sign ?up|auth|role[- ]based)\b/.test(text));
  const hasRoles = Boolean(spec?.roles?.length || /\b(role|admin|manager|teacher|doctor|employee|student|customer|patient)\b/.test(text));
  const entries = [
    ['CRUD records', true, 'core'],
    ['UI design presets', true, 'core'],
    ['Local app generation', true, 'core'],
    ['Browser / QR preview', true, 'platform'],
    ['APK export', true, 'platform'],
    ['Role-based dashboards', hasRoles ? true : 'available', 'optional'],
    ['Authentication screens', hasAuth ? true : 'available', 'optional'],
    ['Supabase cloud data', storageMode === 'supabase' ? true : 'optional', 'optional'],
    ['Realtime chat', false, 'unsupported'],
    ['Payment gateway', false, 'unsupported'],
    ['Native maps / camera workflows', false, 'unsupported'],
  ];
  return entries.map(([name, status, category]) => ({ name, status, category }));
}

function buildEngineeringReport({ prompt = '', spec = null, code = '', storageMode = 'local', source = '', warnings = [], coverage = null, tableSql = '' } = {}) {
  let normalized = null;
  let specValidation = { valid: true, errors: [], warnings: [] };
  let compilerIssues = [];
  if (spec && typeof spec === 'object') {
    specValidation = normalizeAndValidateAppSpec(spec, { storageMode });
    normalized = specValidation.spec;
    compilerIssues = auditCompilerSpec(normalized);
  }

  const checks = codeChecks(code, storageMode);
  const secrets = detectSecrets(code);
  const effectiveCoverage = coverage || (normalized ? evaluateRequirementCoverage(normalized) : null);
  const stages = [
    { id: 'prompt', label: 'Prompt captured', status: String(prompt).trim() ? 'passed' : 'warning' },
    { id: 'spec', label: 'AppSpec / configuration validated', status: spec ? (specValidation.valid ? 'passed' : 'failed') : 'warning' },
    { id: 'design', label: `UI preset: ${normalizeUiPreset(normalized?.uiPreset || spec?.uiPreset || 'modern')}`, status: 'passed' },
    { id: 'roles', label: 'Role and permission model', status: normalized?.authentication?.enabled ? (normalized.roles?.length ? 'passed' : 'warning') : 'not_applicable' },
    { id: 'code', label: 'Flutter code generated', status: checks.find((c) => c.id === 'code-present')?.pass ? 'passed' : 'failed' },
    { id: 'security', label: 'Static safety / secret scan', status: secrets.length ? 'failed' : 'passed' },
    { id: 'storage', label: storageMode === 'supabase' ? 'Supabase integration configured' : 'Local storage mode selected', status: storageMode === 'supabase' ? (/CREATE TABLE/i.test(tableSql || '') ? 'passed' : 'warning') : 'passed' },
    { id: 'build', label: 'Flutter analyze / build verification', status: 'pending_runtime' },
    { id: 'tests', label: 'Generated app smoke tests', status: 'pending_runtime' },
  ];

  const passedChecks = checks.filter((check) => check.pass).length;
  let score = 55;
  score += passedChecks * 7;
  if (specValidation.valid && spec) score += 10;
  if (normalized?.roles?.length && normalized?.authentication?.enabled) score += 5;
  if (effectiveCoverage?.complete) score += 5;
  score -= Math.min(20, (specValidation.errors?.length || 0) * 5);
  score -= Math.min(15, compilerIssues.length * 3);
  score -= Math.min(20, secrets.length * 10);
  score = Math.max(0, Math.min(95, Math.round(score)));

  const issues = [
    ...(specValidation.errors || []).map((message) => ({ severity: 'error', area: 'AppSpec', message })),
    ...(specValidation.warnings || []).map((message) => ({ severity: 'warning', area: 'AppSpec', message })),
    ...compilerIssues.map((issue) => ({ severity: 'warning', area: 'Compiler', message: issue.reason || issue.id })),
    ...secrets.map((message) => ({ severity: 'error', area: 'Security', message })),
    ...uniq(warnings).map((message) => ({ severity: 'warning', area: 'Generation', message })),
  ];

  const recommendations = [];
  if (!spec) recommendations.push('Persist the normalized AppSpec with this project so changes can be validated and diffed structurally.');
  if (stages.find((s) => s.id === 'build')?.status === 'pending_runtime') recommendations.push('Run Flutter analyze, widget tests, and a build before treating the generated app as release-ready.');
  if (normalized?.authentication?.enabled && storageMode !== 'supabase') recommendations.push('Local role login is prototype authentication; use a real identity provider for production security.');
  if (storageMode === 'supabase' && /USING\s*\(true\)/i.test(tableSql || '')) recommendations.push('Supabase RLS is permissive for development; replace it with user/role-scoped policies before production.');
  if (!issues.length) recommendations.push('No static generation issues detected. Complete runtime build and test verification for release readiness.');

  return {
    version: 1,
    source,
    score,
    grade: score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : score >= 60 ? 'Prototype' : 'Needs attention',
    stages,
    checks,
    issues,
    recommendations,
    capabilityMatrix: capabilityMatrix({ prompt, spec: normalized || spec, storageMode }),
    coverage: effectiveCoverage,
    metrics: {
      entityCount: normalized?.entities?.length || 1,
      fieldCount: normalized?.entities?.reduce((sum, entity) => sum + (entity.fields?.length || 0), 0) || 0,
      roleCount: normalized?.roles?.length || 0,
      screenCount: normalized?.screens?.length || 0,
      codeLines: String(code || '').split(/\r?\n/).length,
      storageMode,
      uiPreset: normalizeUiPreset(normalized?.uiPreset || spec?.uiPreset || 'modern'),
    },
  };
}

module.exports = { buildEngineeringReport, detectSecrets, capabilityMatrix };
