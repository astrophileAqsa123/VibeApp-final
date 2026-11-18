const fs = require("fs");
const path = require("path");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function getClaudeApiKey() {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.ANTHROPIC_API_TOKEN
  );
}

function getClaudeModel() {
  return (
    process.env.CLAUDE_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    "claude-sonnet-5-5"
  );
}

function cleanClaudeText(content) {
  if (!content) return "";

  if (Array.isArray(content)) {
    return content
      .filter((item) => item && item.type === "text")
      .map((item) => item.text || "")
      .join("\n");
  }

  return String(content);
}

/**
 * Normalize every input shape callers use into a valid Anthropic
 * `messages` array.
 *
 * Accepted shapes:
 *   - string                                  -> one user text message
 *   - [{ role, content }]                     -> message list (content may be
 *                                                a string or content blocks)
 *   - [{ type: "text", text }]                -> content blocks for one user msg
 *   - { system, prompt|userPrompt|content, messages, maxTokens|max_tokens }
 */
function normalizeContent(content) {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return { type: "text", text: block };
        if (block && typeof block === "object") {
          if (block.type) return block;
          if (typeof block.text === "string") {
            return { type: "text", text: block.text };
          }
        }
        return null;
      })
      .filter(Boolean);
  }

  if (content && typeof content === "object") {
    return normalizeContent([content]);
  }

  return [{ type: "text", text: String(content ?? "") }];
}

function normalizeClaudeInput(input, options = {}) {
  let system = options.system;
  let maxTokens = options.maxTokens || options.max_tokens;
  let messages;

  if (input && !Array.isArray(input) && typeof input === "object") {
    system = system || input.system;
    maxTokens = maxTokens || input.maxTokens || input.max_tokens;

    if (Array.isArray(input.messages)) {
      messages = input.messages;
    } else {
      messages = [
        {
          role: "user",
          content: input.prompt ?? input.userPrompt ?? input.content ?? "",
        },
      ];
    }
  } else if (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every((m) => m && typeof m === "object" && m.role)
  ) {
    messages = input;
  } else {
    messages = [{ role: "user", content: input }];
  }

  const normalized = messages
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: normalizeContent(m.content),
    }))
    .filter((m) => m.content.length > 0);

  if (!normalized.length) {
    throw new Error("callClaude: no message content supplied.");
  }

  return { messages: normalized, system, maxTokens };
}

async function callClaude(input, options = {}) {
  const apiKey = getClaudeApiKey();

  if (!apiKey) {
    throw new Error(
      "Claude API key is missing. Set ANTHROPIC_API_KEY or CLAUDE_API_KEY."
    );
  }

  const normalized = normalizeClaudeInput(input, options);
  const model = options.model || getClaudeModel();

  // Callers previously passed `max_tokens: 100000`, which was silently
  // ignored. Now that it is honored, cap it to a safe model output limit.
  const maxTokens = Math.min(
    Number(
      normalized.maxTokens ||
        process.env.CLAUDE_MAX_TOKENS ||
        50000
    ),
    Number(process.env.CLAUDE_MAX_OUTPUT_TOKENS || 64000)
  );

  const body = {
    model,
    max_tokens: maxTokens,
    messages: normalized.messages,
  };

  if (normalized.system) {
    body.system = normalized.system;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();

  let data;

  try {
    data = JSON.parse(rawText);
  } catch (_) {
    throw new Error(
      `Claude API returned non-JSON response (${response.status}): ${rawText.slice(
        0,
        1000
      )}`
    );
  }

  if (!response.ok) {
    const apiMessage =
      data?.error?.message ||
      data?.message ||
      rawText;

    throw new Error(
      `Claude API ${response.status}: ${apiMessage}`
    );
  }

  const content = cleanClaudeText(data.content);

  if (!content.trim()) {
    throw new Error("Claude returned an empty response.");
  }

  return {
    model: data.model || model,
    content,
    stopReason: data.stop_reason || null,
    usage: data.usage || null,
  };
}

/* ============================================================
   DART / FLUTTER VALIDATION
   ============================================================ */

function countChar(text, char) {
  let count = 0;

  for (const c of text) {
    if (c === char) count++;
  }

  return count;
}

function removeDartStringsAndComments(code) {
  let output = "";

  let i = 0;
  let state = "normal";

  while (i < code.length) {
    const char = code[i];
    const next = code[i + 1];

    if (state === "normal") {
      if (char === "/" && next === "/") {
        output += "  ";
        i += 2;
        state = "lineComment";
        continue;
      }

      if (char === "/" && next === "*") {
        output += "  ";
        i += 2;
        state = "blockComment";
        continue;
      }

      if (char === "'") {
        output += " ";
        i++;
        state = "singleString";
        continue;
      }

      if (char === '"') {
        output += " ";
        i++;
        state = "doubleString";
        continue;
      }

      output += char;
      i++;
      continue;
    }

    if (state === "lineComment") {
      if (char === "\n") {
        output += "\n";
        state = "normal";
      } else {
        output += " ";
      }

      i++;
      continue;
    }

    if (state === "blockComment") {
      if (char === "*" && next === "/") {
        output += "  ";
        i += 2;
        state = "normal";
      } else {
        output += char === "\n" ? "\n" : " ";
        i++;
      }

      continue;
    }

    if (state === "singleString") {
      if (char === "\\") {
        output += "  ";
        i += 2;
        continue;
      }

      if (char === "'") {
        output += " ";
        i++;
        state = "normal";
        continue;
      }

      output += char === "\n" ? "\n" : " ";
      i++;
      continue;
    }

    if (state === "doubleString") {
      if (char === "\\") {
        output += "  ";
        i += 2;
        continue;
      }

      if (char === '"') {
        output += " ";
        i++;
        state = "normal";
        continue;
      }

      output += char === "\n" ? "\n" : " ";
      i++;
      continue;
    }
  }

  return {
    cleaned: output,
    state,
  };
}

function getBracketBalanceErrors(code) {
  const { cleaned, state } =
    removeDartStringsAndComments(code);

  const stack = [];

  const pairs = {
    "(": ")",
    "[": "]",
    "{": "}",
  };

  const closing = new Set([")", "]", "}"]);

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (pairs[char]) {
      stack.push({
        char,
        index: i,
      });

      continue;
    }

    if (closing.has(char)) {
      const expected = {
        ")": "(",
        "]": "[",
        "}": "{",
      }[char];

      const last = stack[stack.length - 1];

      if (!last || last.char !== expected) {
        return [
          `Unexpected closing '${char}' near character ${i}.`,
        ];
      }

      stack.pop();
    }
  }

  const errors = [];

  if (state === "singleString") {
    errors.push("Unterminated single-quoted string detected.");
  }

  if (state === "doubleString") {
    errors.push("Unterminated double-quoted string detected.");
  }

  if (state === "blockComment") {
    errors.push("Unterminated block comment detected.");
  }

  for (let i = stack.length - 1; i >= 0; i--) {
    const item = stack[i];

    errors.push(
      `Missing closing '${pairs[item.char]}' for '${item.char}' near character ${item.index}.`
    );
  }

  return errors;
}

function getValidationDetails(code, options = {}) {
  const requireEntrypoint = options.requireEntrypoint !== false;
  const errors = [];
  const warnings = [];

  if (!code || typeof code !== "string") {
    return {
      valid: false,
      errors: ["Flutter code is empty."],
      warnings,
    };
  }

  const trimmed = code.trim();

  if (!trimmed) {
    return {
      valid: false,
      errors: ["Flutter code is empty."],
      warnings,
    };
  }

  if (!trimmed.includes("import 'package:flutter/")) {
    warnings.push(
      "No Flutter package import detected."
    );
  }

  if (requireEntrypoint && !/\b(?:void|Future<void>)\s+main\s*\(/.test(trimmed)) {
    errors.push("Flutter entrypoint main() is missing.");
  }

  if (requireEntrypoint && !/\brunApp\s*\(/.test(trimmed)) {
    errors.push("runApp() is missing.");
  }

  if (!/\bMaterialApp\b|\bCupertinoApp\b/.test(trimmed)) {
    warnings.push(
      "MaterialApp/CupertinoApp was not detected."
    );
  }

  errors.push(...getBracketBalanceErrors(code));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function checkFlutterCodeSyntax(code, options = {}) {
  const details = getValidationDetails(code, options);

  return {
    valid: details.valid,
    errors: details.errors,
    warnings: details.warnings,
    error: details.errors.length
      ? details.errors.join(" ")
      : null,
  };
}

/* ============================================================
   CUSTOM SINGLE-FILE GENERATION
   ============================================================ */

async function generateCustomFlutterCode(
  prompt,
  options = {}
) {
  const appSpec = options.appSpec || null;
  const supabaseConfig = options.supabaseConfig || null;

  const systemPrompt = `
You are an expert Flutter developer.

Generate a complete production-quality Flutter application.

The Groq-generated JSON application specification is authoritative.
Do not remove required features.

Return ONLY the complete Dart code for lib/main.dart.

Do not return markdown.
Do not return explanations.
Do not use TODOs.
Do not use placeholders.
Do not use ellipsis.

The code must contain:
- main()
- runApp()
- a valid Flutter application
- all requested screens/features
- valid Dart syntax
`;

  const userMessage = `
USER PROMPT
===========
${prompt}

${
  appSpec
    ? `
GROQ AUTHORITATIVE APPLICATION SPECIFICATION
=============================================
${JSON.stringify(appSpec, null, 2)}
`
    : ""
}

${
  supabaseConfig
    ? `
SUPABASE CONFIGURATION
======================
${JSON.stringify(supabaseConfig, null, 2)}
`
    : ""
}

Generate the complete Flutter application.
`;

  const response = await callClaude(userMessage, {
    system: systemPrompt,
    maxTokens: Number(
      options.maxTokens ||
        process.env.CLAUDE_CODE_MAX_TOKENS ||
        50000
    ),
  });

  let code = response.content.trim();

  code = code
    .replace(/^```dart\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const validation = getValidationDetails(code);

  if (!validation.valid) {
    throw new Error(
      `Claude returned invalid Flutter generation:\n${validation.errors.join(
        "\n"
      )}`
    );
  }

  return {
    code,
    generatedCode: code,
    model: response.model,
    usage: response.usage,
    stopReason: response.stopReason,
    source: "claude-sonnet-single-file",
  };
}

/* ============================================================
   TARGETED SELF HEAL
   ============================================================ */

async function selfHealGenerationFailure({
  prompt,
  failedCode,
  error,
  appSpec = null,
  supabaseConfig = null,
}) {
  const repairError =
    error ||
    "Flutter code validation/build validation failed.";

  const systemPrompt = `
You are a Flutter syntax repair specialist.

Repair the supplied Flutter code.

IMPORTANT:
- Fix the actual reported errors.
- Do not redesign the application.
- Do not remove features.
- Do not replace the application with a trivial example.
- Return ONLY complete Dart code.
- Do not use markdown.
- Do not use TODOs.
- Do not use placeholders.
- Do not use ellipsis.
`;

  const userMessage = `
ORIGINAL USER PROMPT
====================
${prompt}

REPORTED ERROR
==============
${repairError}

${appSpec ? `
GROQ AUTHORITATIVE SPECIFICATION
=================================
${JSON.stringify(appSpec, null, 2)}
` : ""}

${
  supabaseConfig
    ? `
SUPABASE CONFIGURATION
======================
${JSON.stringify(supabaseConfig, null, 2)}
`
    : ""
}

FAILED FLUTTER CODE
===================
${failedCode}

Repair the code and return the complete corrected Dart file.
`;

  const response = await callClaude(userMessage, {
    system: systemPrompt,
    maxTokens: Number(
      process.env.CLAUDE_REPAIR_MAX_TOKENS || 50000
    ),
  });

  let repairedCode = response.content.trim();

  repairedCode = repairedCode
    .replace(/^```dart\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const validation = getValidationDetails(repairedCode);

  if (!validation.valid) {
    throw new Error(
      `Claude self-healing failed:\n${validation.errors.join(
        "\n"
      )}`
    );
  }

  return {
    code: repairedCode,
    generatedCode: repairedCode,
    model: response.model,
    usage: response.usage,
    stopReason: response.stopReason,
    source: "claude-sonnet-self-healing",
  };
}

/* ============================================================
   EDIT SINGLE FILE
   ============================================================ */

async function editFlutterCodeWithClaude({
  prompt,
  currentCode,
  appSpec = null,
  supabaseConfig = null,
}) {
  if (!currentCode || typeof currentCode !== "string") {
    throw new Error("Current Flutter code is required.");
  }

  const systemPrompt = `
You are an expert Flutter developer modifying an existing Flutter app.

Return ONLY the complete updated Dart code.

Rules:
- Preserve existing functionality.
- Implement the requested change.
- Do not remove unrelated features.
- Do not use TODOs.
- Do not use placeholders.
- Do not use ellipsis.
- Ensure valid Dart syntax.
`;

  const userMessage = `
REQUESTED CHANGE
================
${prompt}

${
  appSpec
    ? `
GROQ APPLICATION SPECIFICATION
===============================
${JSON.stringify(appSpec, null, 2)}
`
    : ""
}

${
  supabaseConfig
    ? `
SUPABASE CONFIGURATION
======================
${JSON.stringify(supabaseConfig, null, 2)}
`
    : ""
}

CURRENT FLUTTER CODE
====================
${currentCode}

Return the complete updated Dart code.
`;

  const response = await callClaude(userMessage, {
    system: systemPrompt,
    maxTokens: Number(
      process.env.CLAUDE_EDIT_MAX_TOKENS || 50000
    ),
  });

  let code = response.content.trim();

  code = code
    .replace(/^```dart\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const validation = getValidationDetails(code);

  if (!validation.valid) {
    throw new Error(
      `Claude returned invalid edited Flutter code:\n${validation.errors.join(
        "\n"
      )}`
    );
  }

  return {
    code,
    generatedCode: code,
    model: response.model,
    usage: response.usage,
    stopReason: response.stopReason,
    source: "claude-sonnet-edit",
  };
}

module.exports = {
  callClaude,
  normalizeClaudeInput,
  getClaudeApiKey,
  getClaudeModel,
  cleanClaudeText,
  getValidationDetails,
  checkFlutterCodeSyntax,
  generateCustomFlutterCode,
  selfHealGenerationFailure,
  editFlutterCodeWithClaude,
};