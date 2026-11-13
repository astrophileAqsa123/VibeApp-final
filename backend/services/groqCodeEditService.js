const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEPRECATED_GROQ_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
]);
const configuredModel = String(process.env.GROQ_MODEL || "").trim();
const GROQ_MODEL_CHAIN = [
  configuredModel && !DEPRECATED_GROQ_MODELS.has(configuredModel)
    ? configuredModel
    : null,
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
].filter(Boolean).filter((model, index, all) => all.indexOf(model) === index);

function stripCodeFence(text = "") {
  return String(text || "")
    .replace(/^```dart\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractToolFailureContent(data) {
  const failed = data?.error?.failed_generation;
  if (!failed) return "";
  if (typeof failed === "object" && typeof failed.arguments === "string") {
    return stripCodeFence(failed.arguments);
  }
  const text = String(failed);
  const marker = text.match(/["']arguments["']\s*:/i);
  if (!marker || marker.index == null) return "";
  let body = text.slice(marker.index + marker[0].length).trim();
  const lastWrapperBrace = body.lastIndexOf("}");
  if (lastWrapperBrace > 0) body = body.slice(0, lastWrapperBrace).trim();
  return stripCodeFence(body);
}

function validateFlutterCode(code = "") {
  const value = String(code || "");

  if (!value.includes("void main")) {
    throw new Error("Updated code is missing void main().");
  }

  if (!value.includes("MaterialApp")) {
    throw new Error("Updated code is missing MaterialApp.");
  }

  if (value.length < 800) {
    throw new Error("Updated code is too short or incomplete.");
  }

  return true;
}

async function editFlutterCodeWithGroq({
  instruction,
  existingCode,
  originalPrompt = "",
  maxOutputTokens = 8000,
}) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing in backend .env");
  }

  const isSupabase =
    existingCode.includes("package:supabase_flutter/supabase_flutter.dart") ||
    existingCode.includes("Supabase.initialize");

  const systemPrompt = `
You are a senior Flutter developer editing an existing Flutter CRUD app.

Rules:
- Return only complete updated Dart code.
- Do not explain anything.
- Do not use markdown.
- Do not wrap code in triple backticks.
- Keep the app as one complete main.dart file.
- Preserve create, list/read/search, update/edit, and delete.
- If the code uses supabase_flutter or Supabase for data storage/CRUD, you MUST preserve all Supabase imports, Supabase.initialize, supabase client queries, and async Supabase CRUD operations. NEVER replace Supabase with in-memory lists, mock data, or localStorage.
- Apply only the requested change.
- Do not remove working features unless the user asks.
- Do not add unsupported packages.
- Understand conversational requests and infer the smallest safe change that satisfies them.
- Fully wire new UI and actions. Do not introduce TODOs, dead buttons, placeholder callbacks, or fake success messages.
- For in-memory apps, simulate requested integrations locally behind a clearly named service/repository instead of refusing the edit.
- For login or role-based requests, add a working demo session, visible demo accounts, logout, current-role display, role-specific navigation, and permission guards for protected actions. Label preview authentication honestly.
- Preserve validation, empty/loading/error states, accessibility, responsive layouts, and all unrelated behavior.
- PREVENT RENDERFLEX OVERFLOW:
  * ALWAYS wrap Scaffold body Columns, form dialogs, and content areas in SingleChildScrollView(child: Column(...)) or ListView so content can scroll without "A RenderFlex overflowed by X pixels on the bottom".
  * ALWAYS include resizeToAvoidBottomInset: true on Scaffold so the soft keyboard does not cause bottom overflow.
  * In dialogs (AlertDialog / Dialog), ALWAYS wrap the content Column in SingleChildScrollView.
  * In Rows or Columns, wrap dynamic/expanding children in Expanded or Flexible, never fixed unbounded sizes.
- Keep the code buildable for Flutter web and Android.
`;

  const userPrompt = `
Original app request:
${originalPrompt}${isSupabase ? "\nStorage: Supabase (Preserve all supabase_flutter imports, initialization, and queries)" : ""}

Requested change:
${instruction}

Existing Flutter code:
${existingCode}

Return the full updated Dart code only.
`;

  let lastError = null;
  let updatedCode = "";

  for (const model of GROQ_MODEL_CHAIN) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_tokens: Math.max(300, Math.min(8000, Number(maxOutputTokens) || 8000)),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (response.ok) {
      updatedCode = stripCodeFence(data?.choices?.[0]?.message?.content || "");
      if (updatedCode) break;
      lastError = new Error(`Groq model ${model} returned an empty response.`);
      continue;
    }

    const toolFailure = data?.error?.code === "tool_use_failed" ||
      String(data?.error?.message || "").toLowerCase().includes("tool choice is none");

    if (toolFailure) {
      const recovered = extractToolFailureContent(data);
      if (recovered) {
        updatedCode = recovered;
        break;
      }
      lastError = new Error(data?.error?.message || `Groq model ${model} tool-use formatting failure.`);
      continue;
    }

    const message = data?.error?.message || data?.message || `Groq code edit failed with status ${response.status}`;
    const modelSpecific = response.status === 404 || response.status === 400 && /model|decommission|access/i.test(message);
    lastError = new Error(message);
    if (modelSpecific) continue;
    throw lastError;
  }

  if (!updatedCode) throw lastError || new Error("No Groq model returned edited Flutter code.");

  validateFlutterCode(updatedCode);

  return { updatedCode };
}

module.exports = {
  editFlutterCodeWithGroq,
};
