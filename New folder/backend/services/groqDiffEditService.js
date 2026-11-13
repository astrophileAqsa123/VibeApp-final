const Groq = require("groq-sdk");

const DEPRECATED_GROQ_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3.6-27b",
]);
const configuredModel = String(process.env.GROQ_MODEL || "").trim();
const GROQ_MODEL_CHAIN = [
  configuredModel && !DEPRECATED_GROQ_MODELS.has(configuredModel) ? configuredModel : null,
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
].filter(Boolean).filter((model, index, all) => all.indexOf(model) === index);
const DIFF_MAX_OUTPUT_TOKENS = Math.max(300, Math.min(850, Number(process.env.GROQ_DIFF_MAX_OUTPUT_TOKENS || 700)));

const SNIPPET_WINDOW = 3200; // chars to extract around the relevant section

function stripCodeFence(text = "") {
  return String(text || "")
    .replace(/^```(?:json|dart)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeText(text = "") {
  return String(text || "").toLowerCase().replace(/[_-]/g, " ").trim();
}

/**
 * Stop words to ignore when doing fuzzy keyword search in code.
 */
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "make", "change", "please", "can", "you",
  "app", "code", "flutter", "dart", "want", "like", "into", "from", "that",
  "this", "have", "been", "will", "some", "more", "also", "just", "then",
]);

/**
 * Hints: maps instruction keywords → real Flutter code patterns used in VibeApp factories
 * (uniqueFlutterCrudFactory.js and supabaseCrudFactory.js).
 */
const WIDGET_HINTS = [
  {
    words: ["header", "title", "logo", "emoji", "banner", "domain", "top bar", "app title", "subtitle", "description", "headline"],
    patterns: [
      "Widget _buildHeader() {",
      "Widget _buildHeader()",
      "Widget _buildHeader",
      "_buildHeader() {",
      "AppProfile.appName",
      "AppProfile.logo",
      "AppProfile.domain",
    ],
  },
  {
    words: ["card", "cards", "item", "tile", "record", "row", "badge", "avatar", "pill", "border radius", "elevation", "shadow"],
    patterns: [
      "Widget _recordCard(",
      "_recordCard(Map<String, dynamic>",
      "Widget _recordCard",
      "Widget _tableRow(",
      "Widget _tableRow",
      "Widget _boardColumn(",
      "Widget _boardColumn",
    ],
  },
  {
    words: ["form", "dialog", "modal", "input", "popup", "add record", "edit record", "datepicker", "calendar", "dropdown", "select"],
    patterns: [
      "Future<void> _openForm(",
      "_openForm({Map<String, dynamic>?",
      "showDatePicker(",
      "DropdownButtonFormField<String>(",
      "inputDecorationTheme:",
    ],
  },
  {
    words: ["delete", "trash", "remove record", "confirm", "confirmation", "alert"],
    patterns: [
      "Future<void> _deleteRecord(",
      "_deleteRecord(int id",
      "Delete ${AppProfile.entity}?",
      "AlertDialog(",
    ],
  },
  {
    words: ["search", "searchbar", "search bar", "magnifier", "clear search", "filter input"],
    patterns: [
      "Widget _buildSearchBar() {",
      "Widget _buildSearchBar()",
      "Widget _buildSearchBar",
      "_searchController",
      "hintText: 'Search",
    ],
  },
  {
    words: ["stats", "total", "count", "metrics", "summary", "banner", "kpi"],
    patterns: [
      "Widget _buildStatsBanner() {",
      "Widget _buildStatsBanner()",
      "Widget _buildStatsBanner",
      "totalCount",
      "totalSum",
    ],
  },
  {
    words: ["filter", "chips", "chip", "tabs", "category filter", "status filter", "active pending"],
    patterns: [
      "Widget _buildFilterChips() {",
      "Widget _buildFilterChips()",
      "Widget _buildFilterChips",
      "ChoiceChip(",
      "_activeFilter",
    ],
  },
  {
    words: ["empty", "no records", "empty state", "placeholder icon"],
    patterns: [
      "Widget _buildEmptyState() {",
      "Widget _buildEmptyState()",
      "Widget _buildEmptyState",
      "No ${AppProfile.entity.toLowerCase()} records yet",
    ],
  },
  {
    words: ["button", "fab", "floating", "add button", "plus button", "action button"],
    patterns: [
      "FloatingActionButton.extended(",
      "FloatingActionButton(",
      "ElevatedButton.icon(",
      "OutlinedButton.icon(",
      "IconButton(",
    ],
  },
  {
    words: ["theme", "color", "colour", "background", "primary", "secondary", "surface", "accent", "dark mode", "light mode"],
    patterns: [
      "class AppProfile {",
      "ThemeData(",
      "colorScheme: ColorScheme.fromSeed(",
    ],
  },
  {
    words: ["layout", "grid", "table", "timeline", "kanban", "board", "list view", "stack"],
    patterns: [
      "Widget _buildBody(",
      "Widget _buildGrid(",
      "Widget _buildTable(",
      "Widget _buildTimeline(",
      "Widget _buildBoard(",
      "Widget _buildList(",
    ],
  },
  {
    words: ["scaffold", "safearea", "body", "screen", "snack", "snackbar"],
    patterns: [
      "ScaffoldMessenger.of(context).showSnackBar(",
      "Scaffold(",
      "Widget build(BuildContext context)",
    ],
  },
];

/**
 * Try to find the end of a Dart function/widget block by counting braces.
 */
function findBlockEnd(code, startIdx, maxLen = 4000) {
  let depth = 0;
  let started = false;
  const end = Math.min(code.length, startIdx + maxLen);
  for (let i = startIdx; i < end; i++) {
    if (code[i] === "{") { depth++; started = true; }
    else if (code[i] === "}") {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return end;
}

/**
 * Search the code for keyword density matching the user's instruction words.
 */
function findKeywordDensityCenter(code, instruction) {
  const words = normalizeText(instruction)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  if (!words.length) return -1;

  const lowerCode = code.toLowerCase();
  const hitIndices = [];

  for (const word of words) {
    let pos = 0;
    while ((pos = lowerCode.indexOf(word, pos)) !== -1) {
      hitIndices.push(pos);
      pos += word.length;
      if (hitIndices.length > 80) break;
    }
  }

  if (!hitIndices.length) return -1;

  // Find the index with the most keyword hits within a 1200 char window
  let bestIdx = hitIndices[0];
  let maxCluster = 0;

  for (const idx of hitIndices) {
    const clusterCount = hitIndices.filter((other) => Math.abs(other - idx) <= 1200).length;
    if (clusterCount > maxCluster) {
      maxCluster = clusterCount;
      bestIdx = idx;
    }
  }

  return bestIdx;
}

/**
 * Extract the most relevant snippet of code for the given instruction.
 */
function compilerLocationIndex(code, instruction) {
  const match = String(instruction || '').match(/(?:lib[\\/]main\.dart|main\.dart):(\d+):(\d+)/i);
  if (!match) return -1;
  const lineNumber = Math.max(1, Number(match[1]) || 1);
  const columnNumber = Math.max(1, Number(match[2]) || 1);
  const lines = String(code || '').split(/\r?\n/);
  if (lineNumber > lines.length) return -1;
  let index = 0;
  for (let i = 0; i < lineNumber - 1; i += 1) index += lines[i].length + 1;
  return Math.min(String(code || '').length, index + Math.min(columnNumber - 1, lines[lineNumber - 1].length));
}

function extractRelevantSnippet(code, instruction) {
  const instrNorm = normalizeText(instruction);

  // Compiler diagnostics are the strongest repair signal. Use the exact
  // line/column before any fuzzy widget anchor so Groq sees the failing source.
  const compilerIndex = compilerLocationIndex(code, instruction);
  if (compilerIndex >= 0) {
    const halfWindow = Math.floor(SNIPPET_WINDOW / 2);
    const start = Math.max(0, compilerIndex - halfWindow);
    const end = Math.min(code.length, start + SNIPPET_WINDOW);
    return { snippet: code.slice(start, end), startIdx: start, anchoredAt: 'compiler-location' };
  }

  // 0. Compiler-directed anchors. Self-healing instructions contain the actual
  // Flutter compiler error, so prefer the symbol/API named by the compiler over
  // generic UI keywords. This prevents unrelated anchors (for example a dropdown)
  // from being selected for a chart type error.
  const compilerAnchors = [
    { when: /list<num>.*list<double>|list<double>.*list<num>/i, patterns: ['class SimpleBars', 'SimpleBars(values:', 'final week=', 'final history='] },
    { when: /withvalues|withopacity/i, patterns: ['.withValues(', '.withOpacity('] },
    { when: /initialvalue|dropdownbuttonformfield/i, patterns: ['DropdownButtonFormField<String>(', 'DropdownButtonFormField('] },
    { when: /special meaning inside a string|\$\$\{|literal dollar/i, patterns: ["$${", "r'$'", "'$'"] },
    { when: /regexp.*string|endswith\(regexp|startswith\(regexp/i, patterns: ['endsWith(RegExp', 'startsWith(RegExp'] },
  ];
  for (const rule of compilerAnchors) {
    if (!rule.when.test(instruction)) continue;
    for (const pattern of rule.patterns) {
      const idx = code.indexOf(pattern);
      if (idx !== -1) {
        const halfWindow = Math.floor(SNIPPET_WINDOW / 2);
        const start = Math.max(0, idx - halfWindow);
        const end = Math.min(code.length, start + SNIPPET_WINDOW);
        return { snippet: code.slice(start, end), startIdx: start, anchoredAt: `compiler:${pattern}` };
      }
    }
  }

  // 1. Try pattern-based search: match known widget signatures from factories
  for (const hint of WIDGET_HINTS) {
    if (hint.words.some((w) => instrNorm.includes(w))) {
      for (const pattern of hint.patterns) {
        const idx = code.indexOf(pattern);
        if (idx !== -1) {
          const blockEnd = findBlockEnd(code, idx);
          const start = Math.max(0, idx - 150);
          const end = Math.min(code.length, Math.max(blockEnd, idx + SNIPPET_WINDOW));
          return {
            snippet: code.slice(start, end),
            startIdx: start,
            anchoredAt: pattern,
          };
        }
      }
    }
  }

  // 2. Fuzzy Keyword Density Search across full code
  const densityCenter = findKeywordDensityCenter(code, instruction);
  if (densityCenter !== -1) {
    const halfWindow = Math.floor(SNIPPET_WINDOW / 2);
    const start = Math.max(0, densityCenter - halfWindow);
    const end = Math.min(code.length, densityCenter + halfWindow);
    return {
      snippet: code.slice(start, end),
      startIdx: start,
      anchoredAt: "keyword-density-match",
    };
  }

  // 3. Smart Fallback: Anchor around _buildBody / Scaffold instead of raw imports
  const bodyIdx = code.indexOf("Widget _buildBody(");
  if (bodyIdx !== -1) {
    const start = Math.max(0, bodyIdx - 100);
    const end = Math.min(code.length, start + SNIPPET_WINDOW);
    return {
      snippet: code.slice(start, end),
      startIdx: start,
      anchoredAt: "_buildBody-fallback",
    };
  }

  const scaffoldIdx = code.indexOf("Scaffold(");
  if (scaffoldIdx !== -1) {
    const start = Math.max(0, scaffoldIdx - 100);
    const end = Math.min(code.length, start + SNIPPET_WINDOW);
    return {
      snippet: code.slice(start, end),
      startIdx: start,
      anchoredAt: "scaffold-fallback",
    };
  }

  // 4. Default start of file
  return {
    snippet: code.slice(0, SNIPPET_WINDOW),
    startIdx: 0,
    anchoredAt: "file-start",
  };
}

/**
 * Line-tolerant search & replace for Dart code.
 * Handles variations in indentation, line endings, and quotes.
 */
function applyPatch(fullCode, findStr, replaceStr) {
  if (!findStr || typeof findStr !== "string") return null;

  // Level 1: Exact match
  if (fullCode.includes(findStr)) {
    return fullCode.replace(findStr, replaceStr);
  }

  // Level 2: Line-ending and tab normalization
  const normCode = fullCode.replace(/\r\n/g, "\n").replace(/\t/g, "  ");
  const normFind = findStr.replace(/\r\n/g, "\n").replace(/\t/g, "  ");
  if (normCode.includes(normFind)) {
    return normCode.replace(normFind, replaceStr.replace(/\r\n/g, "\n"));
  }

  // Level 3: Quote normalization (' vs ")
  const quoteSwapFind = normFind.includes("'")
    ? normFind.replace(/'/g, '"')
    : normFind.replace(/"/g, "'");
  if (normCode.includes(quoteSwapFind)) {
    return normCode.replace(quoteSwapFind, replaceStr);
  }

  // Level 4: Line-by-line trimmed match
  const findLines = normFind.split("\n").map((l) => l.trim()).filter(Boolean);
  if (findLines.length > 0) {
    const codeLines = normCode.split("\n");
    for (let i = 0; i <= codeLines.length - findLines.length; i++) {
      let matched = true;
      for (let j = 0; j < findLines.length; j++) {
        if (codeLines[i + j].trim() !== findLines[j]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        // Calculate indentation of the first matched line
        const leadingIndent = codeLines[i].match(/^\s*/)?.[0] || "";
        const replaceLines = replaceStr.split("\n").map((line, idx) => {
          if (idx === 0) return leadingIndent + line.trimStart();
          return line;
        });

        codeLines.splice(i, findLines.length, replaceLines.join("\n"));
        return codeLines.join("\n");
      }
    }
  }

  return null; // Could not be patched
}

/**
 * Diff-mode Groq edit with auto-retry and context extraction.
 */
async function editFlutterCodeWithGroqDiff({
  instruction,
  existingCode,
  originalPrompt = "",
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing in backend .env");
  }

  if (!instruction || !String(instruction).trim()) {
    throw new Error("Edit instruction is required.");
  }

  if (!existingCode || !String(existingCode).trim()) {
    throw new Error("Existing Flutter code is required.");
  }

  const isSupabase =
    existingCode.includes("package:supabase_flutter/supabase_flutter.dart") ||
    existingCode.includes("Supabase.initialize");

  const { snippet, anchoredAt } = extractRelevantSnippet(existingCode, instruction);

  const systemPrompt = `You are an expert Flutter Dart code modifier. You receive a CODE SNIPPET and an EDIT INSTRUCTION.

Rules:
- Return ONLY a single-line valid JSON object in this exact format:
  {"find": "...", "replace": "..."}
- "find" MUST be an exact substring copied character-for-character from the CODE SNIPPET. Do NOT summarize or alter it.
- "replace" is the updated version of that exact substring incorporating the user's requested change.
- Change ONLY what the instruction asks. Keep all other variables, callbacks, and structures intact.
- Prevent bottom overflows: wrap new dialog Columns or scrollable bodies in SingleChildScrollView(child: Column(...)).
- If the snippet has supabase_flutter or Supabase calls, preserve all queries and database logic.
- Do NOT use markdown. Do NOT explain. Return raw JSON only.
- If the instruction cannot be applied to this snippet, return: {"find": "", "replace": ""}`;

  const userPrompt = `Original app: ${originalPrompt || "Flutter CRUD app"}${isSupabase ? " (Storage: Supabase)" : ""}
Edit instruction: ${instruction}

CODE SNIPPET (from the app):
${snippet}

Return the JSON patch:`;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  async function completeWithFallback(prompt, temperature) {
    let lastError = null;
    for (const model of GROQ_MODEL_CHAIN) {
      try {
        return await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature,
          max_tokens: DIFF_MAX_OUTPUT_TOKENS,
        });
      } catch (error) {
        lastError = error;
        const message = String(error?.message || error || "");
        const retryable = /model|decommission|access|rate|token|tool|temporar|timeout|overload|service/i.test(message);
        if (!retryable) throw error;
      }
    }
    throw lastError || new Error('No Groq diff-repair model was available.');
  }

  // Pass 1: Groq completion with model failover.
  let response = await completeWithFallback(userPrompt, 0.1);

  let raw = response?.choices?.[0]?.message?.content || "";
  let patch = parsePatchJson(raw);

  // Pass 2: Retry once if patch is missing or find string doesn't exist
  let updatedCode = patch?.find ? applyPatch(existingCode, patch.find, patch.replace) : null;

  if (!updatedCode && patch?.find) {
    console.log("Groq diff patch miss on Pass 1, running strict Pass 2 retry...");
    const retryPrompt = `${userPrompt}\n\nNOTE: Your previous 'find' was not found in the code snippet. Make sure 'find' is an EXACT character-for-character copy from the CODE SNIPPET above.`;
    
    response = await completeWithFallback(retryPrompt, 0.05);

    raw = response?.choices?.[0]?.message?.content || "";
    patch = parsePatchJson(raw);
    if (patch?.find) {
      updatedCode = applyPatch(existingCode, patch.find, patch.replace);
    }
  }

  if (!updatedCode) {
    throw new Error(
      `Could not apply patch to snippet anchored at "${anchoredAt || "section"}".`
    );
  }

  // Basic sanity check — code should still be Flutter code
  if (!updatedCode.includes("void main") || !updatedCode.includes("MaterialApp")) {
    throw new Error("Patch produced invalid Flutter code.");
  }

  return { updatedCode, patchedSnippet: anchoredAt || "widget" };
}

function parsePatchJson(raw = "") {
  const cleaned = stripCodeFence(raw);
  const candidates = [cleaned];
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(cleaned.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed?.find === "string" && typeof parsed?.replace === "string") {
        return parsed;
      }
    } catch (_) {}
  }
  return null;
}

module.exports = {
  editFlutterCodeWithGroqDiff,
  extractRelevantSnippet,
  applyPatch,
};
