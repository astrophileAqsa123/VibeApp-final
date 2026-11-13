const Groq = require("groq-sdk");
const {
  sanitizeGeneratedFlutterCode,
  checkFlutterCodeSyntax,
} = require("./exact500AppTemplates/flutterCodeSafety");

// Do not construct the SDK at module-load time. Routes and offline validation
// tests must still start cleanly when AI editing is intentionally unconfigured.
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const DEPRECATED_GROQ_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
]);

const configuredModel = String(process.env.GROQ_MODEL || "").trim();
const DEFAULT_MODEL_CHAIN = [
  configuredModel && !DEPRECATED_GROQ_MODELS.has(configuredModel)
    ? configuredModel
    : null,
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
].filter(Boolean);

// Groq's on-demand tier commonly allows 8,000 tokens per minute. Keep a
// safety margin because the limit includes both the prompt and the requested
// completion, not only the text that the model eventually returns.
const GROQ_TPM_BUDGET = Math.max(
  2000,
  Number(process.env.GROQ_TPM_BUDGET || 7600) || 7600
);
const MIN_COMPLETION_TOKENS = 600;

function stripCodeFence(text = "") {
  return String(text || "")
    .replace(/^```dart\s*/i, "")
    .replace(/^```flutter\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function isModelAccessError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(
    error?.error?.error?.code || error?.code || ""
  ).toLowerCase();

  return (
    code.includes("model_not_found") ||
    code.includes("model_decommissioned") ||
    message.includes("decommissioned") ||
    (message.includes("model") && message.includes("does not exist")) ||
    message.includes("do not have access")
  );
}


function isToolUseFailure(error) {
  const code = String(
    error?.error?.error?.code || error?.code || ""
  ).toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  return code === "tool_use_failed" || message.includes("tool choice is none");
}

function extractToolFailureContent(error) {
  const failed = error?.error?.error?.failed_generation;
  if (!failed) return "";

  if (typeof failed === "object" && typeof failed.arguments === "string") {
    return failed.arguments.trim();
  }

  const text = String(failed);
  const markerMatch = text.match(/["']arguments["']\s*:/i);
  if (!markerMatch || markerMatch.index == null) return "";

  const start = markerMatch.index + markerMatch[0].length;
  let body = text.slice(start).trim();

  // Groq may serialize a model's accidental tool call as:
  // {"name":"code","arguments": <raw Dart source>}
  // The final brace belongs to the wrapper, so remove exactly one wrapper
  // brace while keeping the closing brace of the Dart program itself.
  const lastWrapperBrace = body.lastIndexOf("}");
  if (lastWrapperBrace > 0) body = body.slice(0, lastWrapperBrace).trim();

  return stripCodeFence(body);
}

function isRateLimitError(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("rate limit") ||
    message.includes("tokens per minute") ||
    message.includes("request too large") ||
    message.includes("too large") ||
    error?.status === 429
  );
}

function getCleanErrorMessage(error) {
  const raw = String(error?.message || "");

  if (
    raw.toLowerCase().includes("incomplete flutter code") ||
    raw.toLowerCase().includes("incomplete updated flutter code")
  ) {
    return "The AI response was incomplete and was rejected before saving or previewing. Please retry, or request a smaller change.";
  }

  if (isModelAccessError(error)) {
    return "AI fallback is unavailable right now. Please use a VibeApp CRUD template prompt such as notepad, student management, inventory, product catalog, appointment, task, or expense tracker.";
  }

  if (isRateLimitError(error)) {
    return "This request is too large for one AI edit. Try one smaller change at a time, such as theme, field, layout, or login screen.";
  }

  if (raw.toLowerCase().includes("api key")) {
    return "AI service is not configured. Please check GROQ_API_KEY in backend .env.";
  }

  return "VibeApp could not process this AI request safely. Try a supported Flutter CRUD app prompt.";
}

function validateFlutterCode(code = "") {
  const text = String(code || "");

  return (
    text.includes("void main") &&
    text.includes("runApp") &&
    text.includes("MaterialApp") &&
    text.length > 500
  );
}

function estimateMessageTokens(messages = []) {
  const characterCount = messages.reduce(
    (total, message) => total + String(message?.content || "").length,
    0
  );
  return Math.ceil(characterCount / 4) + messages.length * 8;
}

function calculateCompletionTokenBudget(messages = [], requestedMax = 6000) {
  const estimatedInputTokens = estimateMessageTokens(messages);
  const available = GROQ_TPM_BUDGET - estimatedInputTokens - 200;

  if (available < MIN_COMPLETION_TOKENS) {
    throw new Error(
      `AI request too large: estimated input uses ${estimatedInputTokens} tokens.`
    );
  }

  return Math.max(
    MIN_COMPLETION_TOKENS,
    Math.min(Number(requestedMax) || 6000, available)
  );
}

function assertValidFlutterCode(code = "", label = "Flutter code") {
  const syntaxCheck = checkFlutterCodeSyntax(code);
  if (!validateFlutterCode(code) || !syntaxCheck.valid) {
    const details = syntaxCheck.errors.length
      ? syntaxCheck.errors.join(", ")
      : "required Flutter application structure is missing";
    throw new Error(`AI returned incomplete Flutter code: ${details}`);
  }
  return code;
}

async function callGroqWithFallback(messages, options = {}) {
  if (!groq) {
    throw new Error("GROQ_API_KEY is missing in backend .env.");
  }
  let lastError = null;
  const maxTokens = calculateCompletionTokenBudget(
    messages,
    options.max_tokens ?? 6000
  );

  for (const model of DEFAULT_MODEL_CHAIN) {
    try {
      console.log(`Trying Groq model: ${model}`);

      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.25,
        max_tokens: maxTokens,
      });

      const content = completion?.choices?.[0]?.message?.content || "";

      return {
        model,
        content,
      };
    } catch (error) {
      lastError = error;

      console.log(`Groq model failed: ${model}`);
      console.log(error?.message || error);

      // Some Groq-hosted models occasionally emit a tool-shaped response even
      // when no tools were supplied. Groq returns HTTP 400 with the generated
      // text inside error.failed_generation. If that payload contains usable
      // Dart, recover it instead of discarding a complete generation.
      if (isToolUseFailure(error)) {
        const recovered = extractToolFailureContent(error);
        if (recovered) {
          console.warn(`Recovered model output from Groq tool_use_failed (${model}).`);
          return { model, content: recovered, recoveredFromToolFailure: true };
        }

        // Treat this as a model-specific formatting failure and try the next
        // configured model instead of failing the whole request immediately.
        continue;
      }

      if (!isModelAccessError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("No Groq model was available.");
}

async function attemptGroqSyntaxRepair(brokenCode, syntaxErrors = []) {
  try {
    console.log("Attempting 1-shot Groq self-repair for syntax errors:", syntaxErrors);
    const repairMessages = [
      {
        role: "system",
        content: `You are an expert Flutter compiler and Dart debugger.
The following Flutter Dart code failed syntax validation with these issues:
${syntaxErrors.map((err) => `- ${err}`).join("\n")}

Fix all syntax errors, close any unclosed brackets or strings, and return the complete, working, compilable Flutter Dart code.
Rules:
- Return ONLY the full compilable Dart code.
- Do NOT use markdown or explanation.
- Do NOT use code fences.
- Keep everything in one main.dart file compiling on Flutter Web.
- Use only package:flutter/material.dart.`,
      },
      {
        role: "user",
        content: `Fix this Flutter code:\n\n${brokenCode}`,
      },
    ];

    // A full-file repair must send the file once and reproduce it once. If
    // that cannot fit in the TPM window, do not make a request that is certain
    // to fail with 413. The caller will reject the broken code safely.
    const estimatedOutputTokens = Math.ceil(String(brokenCode || "").length / 4);
    const availableOutputTokens = calculateCompletionTokenBudget(
      repairMessages,
      6000
    );
    if (availableOutputTokens < estimatedOutputTokens + 250) {
      console.warn(
        `Skipping full-file syntax repair: needs about ${estimatedOutputTokens} output tokens but only ${availableOutputTokens} fit safely.`
      );
      return null;
    }

    const repairResult = await callGroqWithFallback(repairMessages, {
      temperature: 0.1,
      max_tokens: Math.min(6000, estimatedOutputTokens + 600),
    });

    const repairedCode = stripCodeFence(repairResult.content);
    const sanitizedCode = sanitizeGeneratedFlutterCode(repairedCode);
    return checkFlutterCodeSyntax(sanitizedCode).valid ? sanitizedCode : null;
  } catch (err) {
    console.warn("1-shot Groq syntax repair failed:", err.message);
    return null;
  }
}

async function generateFlutterCode(prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing in backend .env.");
  }

  const userPrompt = String(prompt || "").trim();

  if (!userPrompt) {
    throw new Error("Prompt is required.");
  }

  try {
    const messages = [
      {
        role: "system",
        content: `
You are a senior product engineer generating a complete, production-quality Flutter application from the user's request.

Rules:
- Return only Dart code.
- Do not use markdown.
- Do not use code fences.
- Use package:flutter/material.dart only so the preview works without dependency installation.
- Do not use sqflite, path, firebase, supabase, http, camera, maps, payments, or platform plugins.
- When the prompt asks for an external service, implement a polished in-memory simulation with realistic states and clearly named service boundaries; never leave dead buttons or TODO placeholders.
- The generated app must compile on Flutter Web and Android.
- Use an in-memory repository/service as the data source.
- Implement every important user action requested. For record-oriented features include create, read/search/filter, update, delete, validation, confirmation, empty states, and success/error feedback.
- When login or roles are requested, implement a complete in-memory demo session: validated sign-in, visible demo credentials, logout, current-user/role display, role-specific navigation, and permission checks around every protected action. Admin/owner may manage everything; managers may manage operational records; staff/editor roles may create and update; viewer/customer roles are read-only. Clearly label it as preview authentication that must be replaced by a real identity provider and server-side authorization for deployment.
- Architect every generated app with enough meaningful primary screens/routes to cover its real workflows. Screen count must be driven by domain complexity, not a fixed quota. Include only domain-relevant, navigable, functional screens; never add analytics, reports, charts, favorites, or other filler merely to increase the count.
- Every primary screen must have its own purpose, dataset/view-model, controls, labels, and information hierarchy. Do not clone the same metric cards, list rows, sample records, or action panel across multiple routes and merely change the title. Analytics, reports, calendar, favorites, activity, notifications, settings, detail, and create screens must render semantically different content and behavior.
- Use a responsive layout (phone and wide screens), SafeArea, scrollable content, accessible labels/tooltips, readable contrast, and loading/empty/error states.
- Use a coherent Material 3 theme and realistic product copy. Avoid demo counters, lorem ipsum, dead controls, and oversized decorative gradients.
- Keep state transitions deterministic and guard asynchronous actions with mounted checks where relevant.
- Keep everything in one main.dart file.
- Prefer complete working behavior over comments or explanations.
        `.trim(),
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    const result = await callGroqWithFallback(messages, {
      temperature: 0.25,
      max_tokens: 6200,
    });

    let code = stripCodeFence(result.content);
    code = sanitizeGeneratedFlutterCode(code);

    let syntaxCheck = checkFlutterCodeSyntax(code);
    if (!syntaxCheck.valid) {
      console.warn("Initial AI generated code had syntax issues:", syntaxCheck.errors);
      const repaired = await attemptGroqSyntaxRepair(code, syntaxCheck.errors);
      if (repaired && checkFlutterCodeSyntax(repaired).valid) {
        console.log("1-shot Groq self-repair succeeded!");
        code = repaired;
      } else {
        throw new Error("AI returned incomplete Flutter code: " + syntaxCheck.errors.join(", "));
      }
    }

    return assertValidFlutterCode(code);
  } catch (error) {
    console.error("AI generate error:", error);
    throw new Error(getCleanErrorMessage(error));
  }
}

async function editFlutterCode({ instruction, existingCode, originalPrompt }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing in backend .env.");
  }

  const finalInstruction = String(instruction || "").trim();
  const finalCode = String(existingCode || "").trim();

  if (!finalInstruction) {
    throw new Error("Edit instruction is required.");
  }

  if (!finalCode) {
    throw new Error("Existing Flutter code is required.");
  }

  try {
    const messages = [
      {
        role: "system",
        content: `
You are a senior Flutter engineer editing a production-quality application. Treat natural-language instructions flexibly, including short, conversational, or imprecise requests.

Rules:
- Return the full updated Dart file only.
- Do not use markdown.
- Do not use code fences.
- Keep the app compiling on Flutter Web.
- Do not add sqflite, path, firebase, supabase, camera, maps, payment, or platform plugins.
- Use only package:flutter/material.dart unless already safely required.
- Keep CRUD functionality working.
- Preserve every unrelated working feature and the existing storage mode.
- Fully wire new controls and screens; do not add dead buttons, TODOs, or placeholder callbacks.
- Keep layouts responsive, scrollable, accessible, and safe when the keyboard opens.
- If an external integration is requested in an in-memory app, create a realistic local simulation and clear service boundary instead of rejecting the request.
- If login, roles, or permissions are requested, implement or update the full session and authorization flow—not merely a decorative login page. Include logout, role-specific UI, and guards on protected actions.
        `.trim(),
      },
      {
        role: "user",
        content: `
Original prompt:
${originalPrompt || ""}

Edit instruction:
${finalInstruction}

Existing code:
${finalCode}
        `.trim(),
      },
    ];

    const result = await callGroqWithFallback(messages, {
      temperature: 0.2,
      max_tokens: 6200,
    });

    let code = stripCodeFence(result.content);
    code = sanitizeGeneratedFlutterCode(code);

    let syntaxCheck = checkFlutterCodeSyntax(code);
    if (!syntaxCheck.valid) {
      console.warn("Initial AI edited code had syntax issues:", syntaxCheck.errors);
      const repaired = await attemptGroqSyntaxRepair(code, syntaxCheck.errors);
      if (repaired && checkFlutterCodeSyntax(repaired).valid) {
        console.log("1-shot Groq edit self-repair succeeded!");
        code = repaired;
      } else {
        throw new Error("AI returned incomplete updated Flutter code: " + syntaxCheck.errors.join(", "));
      }
    }

    return assertValidFlutterCode(code, "Updated Flutter code");
  } catch (error) {
    console.error("AI edit error:", error);
    throw new Error(getCleanErrorMessage(error));
  }
}

module.exports = {
  generateFlutterCode,
  editFlutterCode,
  attemptGroqSyntaxRepair,
  calculateCompletionTokenBudget,
  assertValidFlutterCode,
};
