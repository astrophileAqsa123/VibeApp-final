const { editFlutterCodeWithGroq } = require('./groqCodeEditService');
const { fixLegacyContextAuthGate } = require('./exact500AppTemplates/flutterCodeSafety');

const MAX_REPAIR_ATTEMPTS = Math.max(0, Math.min(5, Number(process.env.SELF_HEAL_MAX_ATTEMPTS || 3)));

function classifyBuildError(raw = '') {
  const text = String(raw || '');
  const lower = text.toLowerCase();
  const categories = [];
  const add = (type, confidence, evidence) => {
    if (!categories.some((item) => item.type === type)) categories.push({ type, confidence, evidence });
  };

  if (/target of uri doesn't exist|could not find package|because .* depends on|version solving failed|pub get failed/.test(lower)) {
    add('dependency', 0.96, 'Flutter package/dependency resolution failure');
  }
  if (/undefined (name|class|getter|method)|isn't defined|not defined for the (type|class)|method not found/.test(lower)) {
    add('symbol', 0.92, 'Undefined Dart symbol or member');
  }
  if (/expected .*('|"|;|\)|\}|\])|unexpected token|unterminated|syntax error|error: expected/.test(lower)) {
    add('syntax', 0.9, 'Dart syntax/parser failure');
  }
  if (/renderflex overflowed|overflowed by .* pixels/.test(lower)) {
    add('layout', 0.9, 'Flutter layout overflow');
  }
  if (/route|navigator|ongenerateroute|unknown route/.test(lower) && /error|exception|not found|missing/.test(lower)) {
    add('navigation', 0.78, 'Navigation/route configuration problem');
  }
  if (/supabase|postgrest|row level security|rls|relation .* does not exist|column .* does not exist/.test(lower)) {
    add('supabase', 0.82, 'Supabase/schema/runtime integration problem');
  }
  if (/gradle|android sdk|sdkmanager|java_home|keystore|signing/.test(lower)) {
    add('environment', 0.9, 'Android/Gradle/signing environment failure');
  }
  if (/network|timed out|connection reset|could not resolve host|socketexception/.test(lower)) {
    add('environment', 0.85, 'External network/tooling failure');
  }

  if (!categories.length) add('unknown', 0.35, 'Unclassified Flutter build failure');
  return categories;
}

function deterministicRepair(code = '', rawError = '') {
  let updated = String(code || '');
  const fixes = [];

  const legacyRoleGateFixed = fixLegacyContextAuthGate(updated);
  if (legacyRoleGateFixed !== updated) {
    updated = legacyRoleGateFixed;
    fixes.push('Repaired legacy compact role gate emitted by older VibeApp versions');
  }
  const error = String(rawError || '');

  // Common Flutter API migrations that can make generated code fail on newer SDKs.
  const migrations = [
    [/ElevatedButton\.styleFrom\(\s*primary:/g, 'ElevatedButton.styleFrom(backgroundColor:', 'Migrated ElevatedButton primary → backgroundColor'],
    [/TextButton\.styleFrom\(\s*primary:/g, 'TextButton.styleFrom(foregroundColor:', 'Migrated TextButton primary → foregroundColor'],
    [/OutlinedButton\.styleFrom\(\s*primary:/g, 'OutlinedButton.styleFrom(foregroundColor:', 'Migrated OutlinedButton primary → foregroundColor'],
    [/\bprimaryVariant:/g, 'primaryContainer:', 'Migrated ColorScheme primaryVariant → primaryContainer'],
    [/\bsecondaryVariant:/g, 'secondaryContainer:', 'Migrated ColorScheme secondaryVariant → secondaryContainer'],
    [/\baccentColor:/g, 'secondary:', 'Migrated deprecated accentColor'],
  ];
  for (const [pattern, replacement, description] of migrations) {
    if (pattern.test(updated)) {
      updated = updated.replace(pattern, replacement);
      fixes.push(description);
    }
  }


  // Cross-version Flutter compatibility repairs. The build worker may run a
  // different stable Flutter SDK than the model/factory assumed. Prefer older,
  // broadly supported APIs in generated code.
  const withValuesPattern = /\.withValues\(\s*alpha\s*:\s*([^)]+)\)/g;
  if (withValuesPattern.test(updated)) {
    updated = updated.replace(withValuesPattern, '.withOpacity($1)');
    fixes.push('Migrated Color.withValues(alpha:) -> withOpacity() for Flutter SDK compatibility');
  }

  const dropdownInitialValuePattern = /(DropdownButtonFormField(?:<[^>]+>)?\s*\([^)]*?)\binitialValue\s*:/g;
  if (dropdownInitialValuePattern.test(updated)) {
    updated = updated.replace(dropdownInitialValuePattern, '$1value:');
    fixes.push('Migrated DropdownButtonFormField initialValue -> value for older Flutter SDK compatibility');
  }

  // Repair invalid Dart currency interpolation emitted by nested JS templates.
  // Example invalid Dart: '$${amount}' -> valid Dart: '\$${amount}'.
  if (/\$\$\{/.test(updated)) {
    updated = updated.replace(/\$\$\{/g, () => '\\$${');
    fixes.push('Escaped literal currency dollar before Dart interpolation');
  }

  // A bare '$' inside a Dart string is invalid because it starts interpolation.
  // Use a raw Dart string so the literal survives JavaScript/template nesting.
  const bareDollarPattern = /(?<!r)'\$'/g;
  if (bareDollarPattern.test(updated)) {
    updated = updated.replace(bareDollarPattern, () => "r'$'");
    fixes.push('Replaced bare Dart dollar string with raw literal');
  }

  // Generated chart maxima must remain double when the widget API expects double.
  // Example: [food, travel, 1].reduce(...) can infer num; use <double>[..., 1.0].
  const numericMaxList = /maxValue:\s*\[([^\]]+),\s*1\]\s*\.reduce\(\(a,\s*b\)\s*=>\s*a\s*>\s*b\s*\?\s*a\s*:\s*b\)/g;
  updated = updated.replace(numericMaxList, (match, values) => {
    fixes.push('Forced chart maxValue list to double');
    return `maxValue:<double>[${values},1.0].reduce((a,b)=>a>b?a:b)`;
  });

  // Generated chart data can infer List<num> when a literal list mixes integer
  // and double expressions. SimpleBars is intentionally numeric, but older generated
  // code may still declare an untyped local list and pass it to List<double>.
  // When the compiler reports exactly that mismatch, make the local chart list
  // explicitly double and normalize integer literals inside it.
  if (/List<num>['"]? can(?:not|'t) be assigned to the parameter type ['"]List<double>/i.test(error) ||
      /argument type ['"]List<num>['"] can(?:not|'t) be assigned to the parameter type ['"]List<double>['"]/i.test(error)) {
    const chartVars = new Set();
    const usagePattern = /SimpleBars\s*\(\s*values\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/g;
    for (const match of updated.matchAll(usagePattern)) chartVars.add(match[1]);

    for (const variable of chartVars) {
      const declaration = new RegExp(`final\\s+${variable}\\s*=\\s*\\[([^;]+)\\];`, 'g');
      updated = updated.replace(declaration, (full, body) => {
        const normalizedBody = body.replace(/(?<![A-Za-z0-9_.])(-?\d+)(?![A-Za-z0-9_.])/g, '$1.0');
        fixes.push(`Forced chart data ${variable} to List<double>`);
        return `final ${variable}=<double>[${normalizedBody}];`;
      });
    }
  }

  // Dart String.startsWith/endsWith accept String, not RegExp. LLMs often
  // generate JavaScript-style calls such as value.endsWith(RegExp(r'[+\-*/]')).
  // Convert them to anchored RegExp.hasMatch(...) calls.
  const regexStringMethod = /([A-Za-z_][A-Za-z0-9_.$]*)\.(startsWith|endsWith)\(\s*RegExp\(\s*(r)?(["'])(.*?)\4\s*\)\s*\)/g;
  updated = updated.replace(regexStringMethod, (match, target, method, rawPrefix, quote, pattern) => {
    const isStart = method === 'startsWith';
    let anchored = pattern;
    if (isStart) {
      if (!anchored.startsWith('^')) anchored = `^${anchored}`;
    } else if (!anchored.endsWith('$')) {
      anchored = `${anchored}$`;
    }
    const raw = rawPrefix || '';
    fixes.push(`Replaced String.${method}(RegExp) with anchored RegExp.hasMatch`);
    return `RegExp(${raw}${quote}${anchored}${quote}).hasMatch(${target})`;
  });

  // dart:html breaks Android builds. Remove it only for mobile build repair.
  if (/dart:html/.test(updated) && /dart:html|not supported on this platform|web-only/i.test(error)) {
    updated = updated.replace(/^\s*import\s+['"]dart:html['"](?:\s+as\s+\w+)?\s*;\s*$/gm, '');
    fixes.push('Removed web-only dart:html import for Android build');
  }

  return { updatedCode: updated, changed: updated !== code, fixes };
}

function isEnvironmentFailure(categories = []) {
  return categories.length > 0 && categories.every((item) => item.type === 'environment');
}

async function repairCode({ code, buildLog, attempt, originalPrompt = '' }) {
  const categories = classifyBuildError(buildLog);
  const deterministic = deterministicRepair(code, buildLog);
  if (deterministic.changed) {
    return {
      changed: true,
      updatedCode: deterministic.updatedCode,
      strategy: 'deterministic',
      categories,
      summary: deterministic.fixes.join('; '),
    };
  }

  if (isEnvironmentFailure(categories)) {
    return {
      changed: false,
      updatedCode: code,
      strategy: 'not-repairable',
      categories,
      summary: 'Build failed because of environment/tooling configuration; changing generated Dart code would be unsafe.',
    };
  }

  if (!process.env.GROQ_API_KEY) {
    return {
      changed: false,
      updatedCode: code,
      strategy: 'ai-unavailable',
      categories,
      summary: 'No deterministic repair matched and GROQ_API_KEY is not configured.',
    };
  }

  const conciseLog = String(buildLog || '').slice(-5000);
  const instruction = `SELF-HEAL BUILD ATTEMPT ${attempt}. Fix ONLY the Flutter compile/build errors below. Preserve all existing app features, CRUD behavior, UI preset, role behavior, storage mode, and Supabase integration if present. Prefer the smallest compatible change.\n\nBUILD ERROR:\n${conciseLog}`;

  // Primary AI fallback uses snippet/diff mode. The model returns only a small
  // find/replace patch, so repair remains viable even on low-output-token Groq
  // tiers and large generated apps.
  let diffFailure = null;
  try {
    const { editFlutterCodeWithGroqDiff } = require('./groqDiffEditService');
    const diffResult = await editFlutterCodeWithGroqDiff({
      instruction,
      existingCode: String(code || ''),
      originalPrompt,
    });
    const updatedCode = diffResult.updatedCode;
    if (updatedCode && updatedCode !== code) {
      return {
        changed: true,
        updatedCode,
        strategy: 'groq-diff-repair',
        categories,
        summary: `Groq applied a targeted patch around ${diffResult.patchedSnippet || 'the failing section'}; the pipeline will rebuild to verify it.`,
      };
    }
  } catch (error) {
    diffFailure = error;
  }

  // Secondary AI fallback: only attempt a full rewrite when the file is small
  // enough to fit a conservative output budget. Large files stay on diff mode
  // instead of requesting impossible multi-thousand-token completions.
  const fullRewriteLimit = Math.max(2500, Number(process.env.SELF_HEAL_FULL_REWRITE_MAX_CHARS || 5500));
  if (String(code || '').length <= fullRewriteLimit) {
    try {
      const result = await editFlutterCodeWithGroq({
        instruction,
        existingCode: String(code || ''),
        maxOutputTokens: Math.max(300, Math.min(850, Number(process.env.SELF_HEAL_MAX_OUTPUT_TOKENS || 750))),
        originalPrompt,
      });
      const updatedCode = result.updatedCode;
      return {
        changed: updatedCode !== code,
        updatedCode,
        strategy: 'groq-full-repair',
        categories,
        summary: 'Groq produced a bounded full-code repair; the pipeline will rebuild to verify it.',
      };
    } catch (error) {
      return {
        changed: false,
        updatedCode: code,
        strategy: 'repair-failed',
        categories,
        summary: `Targeted Groq repair failed (${diffFailure?.message || 'unknown'}); bounded full repair also failed (${error.message || error}).`,
      };
    }
  }

  return {
    changed: false,
    updatedCode: code,
    strategy: 'repair-failed',
    categories,
    summary: `Targeted Groq repair failed safely: ${diffFailure?.message || 'no applicable patch'}. Full rewrite was skipped because the generated app is too large for the configured output-token budget.`,
  };
}

module.exports = {
  MAX_REPAIR_ATTEMPTS,
  classifyBuildError,
  deterministicRepair,
  isEnvironmentFailure,
  repairCode,
};
