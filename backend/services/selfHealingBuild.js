const { editFlutterCodeWithClaude } = require('./claudeCodeService');
const { fixLegacyContextAuthGate } = require('./exact500AppTemplates/flutterCodeSafety');

// Self-healing keeps sending the build error to Claude until the build
// succeeds, up to this limit (a hard stop protects against endless API
// spend if the app can never compile). Override with SELF_HEAL_MAX_ATTEMPTS.
const MAX_REPAIR_ATTEMPTS = Math.max(
  0,
  Math.min(
    20,
    Number(process.env.SELF_HEAL_MAX_ATTEMPTS || 8)
  )
);

/**
 * Classify build/analyzer errors.
 */
function classifyBuildError(raw = '') {
  const text = String(raw || '');
  const lower = text.toLowerCase();

  const categories = [];

  const add = (type, confidence, evidence) => {
    if (!categories.some((item) => item.type === type)) {
      categories.push({
        type,
        confidence,
        evidence,
      });
    }
  };

  // Dart symbol/type errors
  if (
    /undefined (name|class|getter|method)|isn't defined|not defined for the (type|class)|method not found|argument type .* can't be assigned|type .* is not a subtype|the getter .* isn't defined|the method .* isn't defined/.test(
      lower
    )
  ) {
    add(
      'symbol',
      0.95,
      'Undefined Dart symbol, getter, method, class, or incompatible type'
    );
  }

  // Dart syntax/parser errors
  if (
    /expected .*('|";|\)|\}|\])|unexpected token|unterminated|syntax error|error: expected|missing ','|missing ';'/.test(
      lower
    )
  ) {
    add(
      'syntax',
      0.92,
      'Dart syntax/parser failure'
    );
  }

  // Flutter layout errors
  if (
    /renderflex overflowed|overflowed by .* pixels/.test(
      lower
    )
  ) {
    add(
      'layout',
      0.90,
      'Flutter layout overflow'
    );
  }

  // Dependency errors
  if (
    /target of uri doesn't exist|could not find package|version solving failed|pub get failed|pubspec/.test(
      lower
    )
  ) {
    add(
      'dependency',
      0.96,
      'Flutter package/dependency problem'
    );
  }

  // Supabase/database errors
  if (
    /supabase|postgrest|row level security|rls|relation .* does not exist|column .* does not exist/.test(
      lower
    )
  ) {
    add(
      'supabase',
      0.82,
      'Supabase/database integration problem'
    );
  }

  // Android/Gradle environment errors
  const environmentMarkers = [
    'licenses have not been accepted',
    'accept the sdk license agreements',
    'failed to install the following android sdk packages',
    'platforms;android-',
    'build-tools;',
    'sdkmanager.bat --licenses',
    'using android sdk:',
    'could not determine the dependencies of task',
    'failed to determine the dependencies of task',
    'android sdk',
    'gradle',
    'java_home',
    'keystore',
    'signing',
    'sdk packages',
    'license agreement',
    'license agreements',
  ];

  if (
    environmentMarkers.some((marker) =>
      lower.includes(marker)
    )
  ) {
    add(
      'environment',
      0.98,
      'Android SDK/Gradle/toolchain/license failure'
    );
  }

  // Network/toolchain failures
  if (
    /network|timed out|connection reset|could not resolve host|socketexception|connection refused|failed to download|download.*failed/.test(
      lower
    )
  ) {
    add(
      'environment',
      0.88,
      'Network/toolchain failure'
    );
  }

  if (!categories.length) {
    add(
      'unknown',
      0.35,
      'Unclassified build failure'
    );
  }

  return categories;
}

/**
 * Environment failure detection.
 */
function isEnvironmentFailure(categories = []) {
  return (
    categories.length > 0 &&
    categories.every(
      (item) => item.type === 'environment'
    )
  );
}

function containsEnvironmentFailureText(rawError = '') {
  const lower = String(rawError || '').toLowerCase();

  const markers = [
    'licenses have not been accepted',
    'accept the sdk license agreements',
    'failed to install the following android sdk packages',
    'platforms;android-34',
    'build-tools;30.0.3',
    'sdkmanager.bat --licenses',
    'using android sdk:',
    'could not determine the dependencies of task',
    'failed to determine the dependencies of task',
    'android sdk',
  ];

  return markers.some((marker) =>
    lower.includes(marker)
  );
}

/**
 * Deterministic compatibility repairs.
 */
function deterministicRepair(
  code = '',
  rawError = ''
) {
  let updated = String(code || '');
  const fixes = [];

  // Legacy VibeApp role gate repair
  try {
    const fixed =
      fixLegacyContextAuthGate(updated);

    if (fixed !== updated) {
      updated = fixed;

      fixes.push(
        'Repaired legacy compact role gate'
      );
    }
  } catch (error) {
    console.warn(
      'Legacy role gate repair skipped:',
      error?.message || error
    );
  }

  // Flutter API migrations
  const migrations = [
    [
      /ElevatedButton\.styleFrom\(\s*primary:/g,
      'ElevatedButton.styleFrom(backgroundColor:',
      'Migrated ElevatedButton primary → backgroundColor',
    ],

    [
      /TextButton\.styleFrom\(\s*primary:/g,
      'TextButton.styleFrom(foregroundColor:',
      'Migrated TextButton primary → foregroundColor',
    ],

    [
      /OutlinedButton\.styleFrom\(\s*primary:/g,
      'OutlinedButton.styleFrom(foregroundColor:',
      'Migrated OutlinedButton primary → foregroundColor',
    ],

    [
      /\bprimaryVariant:/g,
      'primaryContainer:',
      'Migrated ColorScheme primaryVariant → primaryContainer',
    ],

    [
      /\bsecondaryVariant:/g,
      'secondaryContainer:',
      'Migrated ColorScheme secondaryVariant → secondaryContainer',
    ],

    [
      /\baccentColor:/g,
      'secondary:',
      'Migrated deprecated accentColor',
    ],
  ];

  for (
    const [
      pattern,
      replacement,
      description,
    ] of migrations
  ) {
    if (pattern.test(updated)) {
      updated = updated.replace(
        pattern,
        replacement
      );

      fixes.push(description);
    }
  }

  // Color.withValues -> withOpacity
  const withValuesPattern =
    /\.withValues\(\s*alpha\s*:\s*([^)]+)\)/g;

  if (
    withValuesPattern.test(updated)
  ) {
    updated = updated.replace(
      withValuesPattern,
      '.withOpacity($1)'
    );

    fixes.push(
      'Migrated Color.withValues(alpha:)'
    );
  }

  // Currency interpolation
  if (/\$\$\{/.test(updated)) {
    updated = updated.replace(
      /\$\$\{/g,
      '\\$${'
    );

    fixes.push(
      'Escaped literal currency dollar'
    );
  }

  return {
    updatedCode: updated,
    changed: updated !== code,
    fixes,
  };
}

/**
 * Validate Claude response.
 *
 * Claude can sometimes return:
 *
 * ```dart
 * import 'package:flutter/material.dart';
 * ...
 * ```
 *
 * or an object/string wrapper.
 *
 * This function extracts the actual Dart source.
 */
function normalizeClaudeCode(response) {
  if (
    response === null ||
    response === undefined
  ) {
    return '';
  }

  let value = response;

  // If service returned an object
  if (typeof value === 'object') {
    value =
      value.updatedCode ||
      value.code ||
      value.generatedCode ||
      value.content ||
      value.text ||
      '';

    // Anthropic-style content array
    if (
      Array.isArray(value)
    ) {
      value = value
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          return (
            item?.text ||
            item?.content ||
            ''
          );
        })
        .join('\n');
    }
  }

  let code = String(value || '').trim();

  if (!code) {
    return '';
  }

  // Remove markdown fences
  code = code
    .replace(/^```dart\s*/i, '')
    .replace(/^```flutter\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // If Claude returned explanatory text before the Dart code,
  // start from the first import/library/void main.
  const starts = [
    code.indexOf(
      "import 'package:flutter"
    ),
    code.indexOf(
      'import "package:flutter'
    ),
    code.indexOf(
      'import \'dart:'
    ),
    code.indexOf(
      'import "dart:'
    ),
    code.indexOf(
      'void main('
    ),
  ].filter((index) => index >= 0);

  if (starts.length > 0) {
    const firstCodeIndex =
      Math.min(...starts);

    if (firstCodeIndex > 0) {
      code =
        code.slice(firstCodeIndex);
    }
  }

  // Remove trailing markdown fence if any
  const fenceIndex =
    code.lastIndexOf('```');

  if (fenceIndex >= 0) {
    code =
      code.slice(0, fenceIndex)
        .trim();
  }

  return code;
}

/**
 * Basic validation before accepting Claude output.
 */
function isValidFlutterCode(code = '') {
  const text = String(code || '').trim();

  if (!text) {
    return false;
  }

  if (text.length < 500) {
    return false;
  }

  const hasMain =
    /\bvoid\s+main\s*\(/.test(text);

  const hasRunApp =
    /\brunApp\s*\(/.test(text);

  const hasMaterialApp =
    /\bMaterialApp\s*\(/.test(text);

  return (
    hasMain &&
    hasRunApp &&
    hasMaterialApp
  );
}

/**
 * Extract a useful string from Claude/service errors.
 */
function getErrorMessage(error) {
  if (!error) {
    return 'Unknown Claude error';
  }

  if (typeof error === 'string') {
    return error;
  }

  return (
    error.message ||
    error.error?.message ||
    error.response?.data?.error?.message ||
    JSON.stringify(error)
  );
}

/**
 * Call Claude for build repair.
 *
 * IMPORTANT:
 * This function intentionally calls Claude through the existing
 * claudeCodeService.js instead of Groq.
 */
async function callClaudeBuildRepair({
  currentCode,
  buildError,
  originalPrompt,
  attempt,
}) {
  const instruction = `
SELF-HEAL BUILD REPAIR

This is build repair attempt ${attempt}.

You are repairing an EXISTING Flutter application.

Do NOT redesign the application.

Do NOT regenerate a different application.

Do NOT remove existing functionality.

Do NOT simplify the app.

Fix ONLY the actual Dart/Flutter compile or analyzer error
shown in the build error below.

Preserve the latest user-requested feature/change.

Preserve:
- screens
- navigation
- UI
- state management
- models
- forms
- validation
- CRUD
- API calls
- Supabase integration
- local storage
- existing architecture
- existing business logic

If a type mismatch exists, fix the type correctly.

If an undefined symbol exists, fix the symbol/import/definition correctly.

If an outdated Flutter API is being used, migrate only that API.

If a syntax error exists, repair the syntax.

Do not add packages unless the existing code genuinely requires one.

IMPORTANT OUTPUT REQUIREMENT:

Return the COMPLETE contents of lib/main.dart.

Do not return a diff.

Do not return a patch.

Do not return a partial file.

Do not use "...".

Do not omit unchanged code.

Do not explain your answer.

Do not wrap the Dart code in markdown fences.

Your entire response must be the Dart source code.

ORIGINAL USER PROMPT:
${String(originalPrompt || '(not available)')}

EXACT FLUTTER BUILD/ANALYZER ERROR:
${String(buildError)}

CURRENT COMPLETE lib/main.dart:
${String(currentCode)}
`;

  console.log(
    'Sending current main.dart + exact analyzer error to Claude...'
  );

  const result =
    await editFlutterCodeWithClaude({
      instruction,
      existingCode: currentCode,
      originalPrompt,
    });

  const normalized =
    normalizeClaudeCode(result);

  console.log(
    `Claude raw response type: ${typeof result}`
  );

  console.log(
    `Claude normalized code length: ${normalized.length}`
  );

  return normalized;
}

/**
 * Main repair function.
 */
async function repairCode({
  code,
  buildLog,
  attempt,
  originalPrompt = '',
}) {
  const currentCode =
    String(code || '');

  const rawBuildError =
    String(buildLog || '');

  const categories =
    classifyBuildError(
      rawBuildError
    );

  console.log('');
  console.log(
    '================================================'
  );
  console.log(
    `Claude/Sonnet build repair attempt ${attempt}`
  );
  console.log(
    `Current Flutter code length: ${currentCode.length}`
  );
  console.log(
    `Build error length: ${rawBuildError.length}`
  );
  console.log(
    '================================================'
  );

  console.log(
    'Build error categories:',
    categories
      .map(
        (item) =>
          item.type
      )
      .join(', ')
  );

  // ============================================================
  // Environment failure
  // ============================================================
  if (
    isEnvironmentFailure(
      categories
    ) ||
    containsEnvironmentFailureText(
      rawBuildError
    )
  ) {
    console.log('');
    console.log(
      'Android/build environment failure detected.'
    );
    console.log(
      'Skipping Claude code repair.'
    );
    console.log(
      'Current main.dart will NOT be modified.'
    );
    console.log('');

    return {
      changed: false,
      updatedCode: currentCode,
      strategy:
        'environment-failure',
      categories,
      environmentFailure: true,
      summary:
        'Android SDK/Gradle/toolchain/license failure. This cannot be fixed by changing main.dart.',
    };
  }

  // ============================================================
  // Deterministic repair
  // ============================================================
  const deterministic =
    deterministicRepair(
      currentCode,
      rawBuildError
    );

  if (
    deterministic.changed
  ) {
    console.log('');
    console.log(
      'Deterministic compatibility repair applied:'
    );

    deterministic.fixes.forEach(
      (fix) => {
        console.log(
          ` - ${fix}`
        );
      }
    );

    console.log('');

    return {
      changed: true,
      updatedCode:
        deterministic.updatedCode,
      strategy:
        'deterministic',
      categories,
      environmentFailure: false,
      summary:
        deterministic.fixes.join(
          '; '
        ),
    };
  }

  // ============================================================
  // Claude key check
  // ============================================================
  const hasClaudeKey =
    Boolean(
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_API_KEY ||
      process.env.ANTHROPIC_API_TOKEN
    );

  if (!hasClaudeKey) {
    console.error(
      'Claude API key is not configured.'
    );

    return {
      changed: false,
      updatedCode: currentCode,
      strategy:
        'claude-api-key-missing',
      categories,
      environmentFailure: false,
      summary:
        'Anthropic/Claude API key is missing.',
    };
  }

  // ============================================================
  // Claude attempt
  // ============================================================
  let updatedCode = '';

  try {
    updatedCode =
      await callClaudeBuildRepair({
        currentCode,
        buildError:
          rawBuildError,
        originalPrompt,
        attempt,
      });
  } catch (error) {
    console.error('');
    console.error(
      'Claude build repair request failed:'
    );
    console.error(
      getErrorMessage(error)
    );
    console.error('');

    return {
      changed: false,
      updatedCode: currentCode,
      strategy:
        'claude-request-failed',
      categories,
      environmentFailure: false,
      summary:
        getErrorMessage(error),
    };
  }

  // ============================================================
  // Empty response
  // ============================================================
  if (!updatedCode) {
    console.warn('');
    console.warn(
      'Claude returned empty code.'
    );
    console.warn(
      'Current main.dart was preserved.'
    );
    console.warn('');

    return {
      changed: false,
      updatedCode: currentCode,
      strategy:
        'claude-empty-response',
      categories,
      environmentFailure: false,
      summary:
        'Claude returned an empty response. Existing Flutter code was preserved.',
    };
  }

  // ============================================================
  // Invalid Flutter response
  // ============================================================
  if (
    !isValidFlutterCode(
      updatedCode
    )
  ) {
    console.warn('');
    console.warn(
      'Claude returned code that does not look like a complete Flutter main.dart.'
    );
    console.warn(
      `Returned code length: ${updatedCode.length}`
    );
    console.warn(
      'Existing main.dart was preserved.'
    );
    console.warn('');

    return {
      changed: false,
      updatedCode: currentCode,
      strategy:
        'claude-invalid-response',
      categories,
      environmentFailure: false,
      summary:
        'Claude returned incomplete or invalid Flutter source. Existing code was preserved.',
    };
  }

  // ============================================================
  // No change
  // ============================================================
  if (
    updatedCode.trim() ===
    currentCode.trim()
  ) {
    console.log(
      'Claude returned the same code.'
    );

    return {
      changed: false,
      updatedCode: currentCode,
      strategy:
        'claude-no-change',
      categories,
      environmentFailure: false,
      summary:
        'Claude returned unchanged Flutter code.',
    };
  }

  // ============================================================
  // Success
  // ============================================================
  console.log('');
  console.log(
    'Claude/Sonnet build repair completed successfully.'
  );
  console.log(
    `Updated Flutter code length: ${updatedCode.length}`
  );
  console.log('');

  return {
    changed: true,
    updatedCode,
    strategy:
      'claude-sonnet-build-repair',
    categories,
    environmentFailure: false,
    summary:
      'Claude/Sonnet repaired the current Flutter code using the exact analyzer error.',
  };
}

module.exports = {
  MAX_REPAIR_ATTEMPTS,
  classifyBuildError,
  deterministicRepair,
  isEnvironmentFailure,
  containsEnvironmentFailureText,
  normalizeClaudeCode,
  isValidFlutterCode,
  repairCode,
};