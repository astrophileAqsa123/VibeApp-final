const path = require("path");
const fs = require("fs");

const {
  callClaude,
  getValidationDetails,
  checkFlutterCodeSyntax,
} = require("./claudeCodeService");

const STRUCTURED_ENABLED =
  String(process.env.STRUCTURED_GENERATION_ENABLED ?? "true").toLowerCase() !==
  "false";

const MAX_PROJECT_FILES = Number(
  process.env.MAX_GENERATED_PROJECT_FILES || 30
);

const MAX_FILE_CHARS = Number(
  process.env.MAX_GENERATED_FILE_CHARS || 50000
);

const MAX_TOTAL_CHARS = Number(
  process.env.MAX_GENERATED_PROJECT_CHARS || 350000
);

/* ============================================================
   SAFE PROJECT PATH
   ============================================================ */

function safeProjectPath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid project file path.");
  }

  let normalized = filePath.replace(/\\/g, "/").trim();

  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  if (
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized === ".." ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new Error(`Unsafe project file path: ${filePath}`);
  }

  const allowed =
    normalized === "pubspec.yaml" ||
    normalized === "analysis_options.yaml" ||
    normalized === "README.md" ||
    normalized.startsWith("lib/");

  if (!allowed) {
    throw new Error(
      `Generated file is outside the allowed Flutter project scope: ${filePath}`
    );
  }

  return normalized;
}

/* ============================================================
   LANGUAGE INFERENCE
   ============================================================ */

function inferLanguage(filePath) {
  if (filePath.endsWith(".dart")) return "dart";

  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return "yaml";
  }

  if (filePath.endsWith(".md")) {
    return "markdown";
  }

  return "text";
}

/* ============================================================
   ROLE INFERENCE
   ============================================================ */

function inferRole(filePath) {
  if (filePath === "lib/main.dart") {
    return "entrypoint";
  }

  if (filePath.includes("/models/")) {
    return "model";
  }

  if (
    filePath.includes("/screens/") ||
    filePath.includes("/pages/")
  ) {
    return "screen";
  }

  if (filePath.includes("/widgets/")) {
    return "widget";
  }

  if (filePath.includes("/services/")) {
    return "service";
  }

  if (
    filePath.includes("/providers/") ||
    filePath.includes("/state/")
  ) {
    return "state";
  }

  if (filePath.includes("/utils/")) {
    return "utility";
  }

  if (filePath.includes("/theme/")) {
    return "theme";
  }

  if (filePath.includes("/config/")) {
    return "config";
  }

  if (filePath.includes("/controllers/")) {
    return "controller";
  }

  if (filePath.includes("/repositories/")) {
    return "repository";
  }

  return "source";
}

/* ============================================================
   FIX DART DIRECTIVE ORDER
   ============================================================ */

/**
 * Dart requires: library -> imports/exports -> parts -> declarations.
 * Claude sometimes emits `library x;` after imports, which breaks
 * `dart format` / compilation ("The library directive must appear
 * before all other directives"). Move it to the top.
 */
function fixDartDirectiveOrder(content) {
  const text = String(content || "");
  const libraryRe = /^[ \t]*library[ \t]+[A-Za-z_][\w.]*[ \t]*;[ \t]*$/gm;
  const matches = text.match(libraryRe);

  if (!matches || matches.length === 0) {
    return text;
  }

  const libraryLine = matches[0].trim();
  const withoutLibrary = text
    .replace(libraryRe, "")
    .replace(/^\n+/, "");

  // Already first directive? (only comments/blank lines before it)
  const firstIdx = text.search(libraryRe);
  const before = text.slice(0, firstIdx);
  const onlyCommentsBefore = before
    .split("\n")
    .every((line) => !line.trim() || /^\s*\/\//.test(line));

  if (onlyCommentsBefore && matches.length === 1) {
    return text;
  }

  return `${libraryLine}\n${withoutLibrary}`;
}

/* ============================================================
   NORMALIZE PROJECT FILES
   ============================================================ */

function normalizeProjectFiles(files) {
  if (!Array.isArray(files)) {
    throw new Error("Claude did not return a valid files array.");
  }

  const seen = new Set();
  const result = [];

  for (const rawFile of files) {
    if (!rawFile || typeof rawFile !== "object") {
      continue;
    }

    if (!rawFile.path) {
      throw new Error("Generated project file is missing a path.");
    }

    const filePath = safeProjectPath(rawFile.path);

    if (seen.has(filePath)) {
      throw new Error(
        `Duplicate generated project file: ${filePath}`
      );
    }

    seen.add(filePath);

    let content =
      typeof rawFile.content === "string"
        ? rawFile.content
        : String(rawFile.content ?? "");

    if (filePath.endsWith(".dart")) {
      content = fixDartDirectiveOrder(content);
    }

    if (!content.trim()) {
      throw new Error(
        `Generated file is empty: ${filePath}`
      );
    }

    if (content.length > MAX_FILE_CHARS) {
      throw new Error(
        `Generated file is too large: ${filePath} (${content.length} chars).`
      );
    }

    result.push({
      path: filePath,
      content,
      language:
        rawFile.language || inferLanguage(filePath),
      role:
        rawFile.role || inferRole(filePath),
    });
  }

  if (result.length === 0) {
    throw new Error(
      "Claude returned zero project files."
    );
  }

  if (result.length > MAX_PROJECT_FILES) {
    throw new Error(
      `Claude returned too many project files: ${result.length}. Maximum is ${MAX_PROJECT_FILES}.`
    );
  }

  const totalChars = result.reduce(
    (sum, file) => sum + file.content.length,
    0
  );

  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error(
      `Generated Flutter project is too large: ${totalChars} characters.`
    );
  }

  return result;
}

/* ============================================================
   EXTRACT JSON
   ============================================================ */

function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Claude returned empty content.");
  }

  let cleaned = text.trim();

  cleaned = cleaned.replace(
    /^```json\s*/i,
    ""
  );

  cleaned = cleaned.replace(
    /^```\s*/i,
    ""
  );

  cleaned = cleaned.replace(
    /\s*```$/i,
    ""
  );

  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Continue with outer object extraction.
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    throw new Error(
      "Could not locate JSON object in Claude response."
    );
  }

  const possibleJson =
    cleaned.slice(
      firstBrace,
      lastBrace + 1
    );

  try {
    return JSON.parse(possibleJson);
  } catch (error) {
    throw new Error(
      `Claude returned malformed project JSON: ${error.message}`
    );
  }
}

/* ============================================================
   PROJECT -> PROMPT
   ============================================================ */

function projectToPrompt(files) {
  return files
    .map(
      (file) =>
        `===== ${file.path} =====
${file.content}
===== END ${file.path} =====`
    )
    .join("\n\n");
}

/* ============================================================
   TOP-LEVEL DART DECLARATION SPLITTER
   ============================================================ */

function splitTopLevelDartDeclarations(source) {
  const text = String(source || "");

  const chunks = [];

  let start = 0;

  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  let i = 0;

  let quote = null;
  let tripleQuote = false;

  let lineComment = false;
  let blockComment = false;

  const pushChunk = (end) => {
    const chunk =
      text.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    start = end;
  };

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    /* --------------------------------------------------------
       LINE COMMENT
       -------------------------------------------------------- */

    if (lineComment) {
      if (ch === "\n") {
        lineComment = false;
      }

      i += 1;
      continue;
    }

    /* --------------------------------------------------------
       BLOCK COMMENT
       -------------------------------------------------------- */

    if (blockComment) {
      if (
        ch === "*" &&
        next === "/"
      ) {
        blockComment = false;
        i += 2;
      } else {
        i += 1;
      }

      continue;
    }

    /* --------------------------------------------------------
       STRING
       -------------------------------------------------------- */

    if (quote) {
      if (tripleQuote) {
        if (
          ch === quote &&
          text[i + 1] === quote &&
          text[i + 2] === quote
        ) {
          quote = null;
          tripleQuote = false;
          i += 3;
        } else {
          i += 1;
        }

        continue;
      }

      if (ch === "\\") {
        i += 2;
        continue;
      }

      if (ch === quote) {
        quote = null;
      }

      i += 1;
      continue;
    }

    /* --------------------------------------------------------
       COMMENT START
       -------------------------------------------------------- */

    if (
      ch === "/" &&
      next === "/"
    ) {
      lineComment = true;
      i += 2;
      continue;
    }

    if (
      ch === "/" &&
      next === "*"
    ) {
      blockComment = true;
      i += 2;
      continue;
    }

    /* --------------------------------------------------------
       STRING START
       -------------------------------------------------------- */

    if (
      ch === "'" ||
      ch === '"'
    ) {
      if (
        text.slice(i, i + 3) ===
        ch.repeat(3)
      ) {
        quote = ch;
        tripleQuote = true;
        i += 3;
      } else {
        quote = ch;
        tripleQuote = false;
        i += 1;
      }

      continue;
    }

    /* --------------------------------------------------------
       BRACES
       -------------------------------------------------------- */

    if (ch === "{") {
      braceDepth += 1;
      i += 1;
      continue;
    }

    if (ch === "}") {
      braceDepth =
        Math.max(
          0,
          braceDepth - 1
        );

      i += 1;

      /*
       * If all nesting levels are zero, this closing brace
       * can represent the end of a top-level declaration.
       */

      if (
        braceDepth === 0 &&
        parenDepth === 0 &&
        bracketDepth === 0
      ) {
        let j = i;

        while (
          j < text.length &&
          /[ \t\r\n;]/.test(text[j])
        ) {
          j += 1;
        }

        /*
         * If another declaration begins after this brace,
         * finish the current chunk.
         */

        if (
          j >= text.length ||
          /[A-Za-z_]/.test(text[j])
        ) {
          pushChunk(j);
          i = j;
          continue;
        }
      }

      continue;
    }

    /* --------------------------------------------------------
       PARENTHESES
       -------------------------------------------------------- */

    if (ch === "(") {
      parenDepth += 1;
      i += 1;
      continue;
    }

    if (ch === ")") {
      parenDepth =
        Math.max(
          0,
          parenDepth - 1
        );

      i += 1;
      continue;
    }

    /* --------------------------------------------------------
       BRACKETS
       -------------------------------------------------------- */

    if (ch === "[") {
      bracketDepth += 1;
      i += 1;
      continue;
    }

    if (ch === "]") {
      bracketDepth =
        Math.max(
          0,
          bracketDepth - 1
        );

      i += 1;
      continue;
    }

    /* --------------------------------------------------------
       TOP-LEVEL SEMICOLON
       -------------------------------------------------------- */

    if (
      ch === ";" &&
      braceDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      pushChunk(i + 1);
      i += 1;
      continue;
    }

    i += 1;
  }

  const tail =
    text.slice(start).trim();

  if (tail) {
    chunks.push(tail);
  }

  return chunks;
}

/* ============================================================
   EXTRACT DART HEADER
   ============================================================ */

function extractDartHeader(source) {
  const text =
    String(source || "");

  const chunks =
    splitTopLevelDartDeclarations(
      text
    );

  const header = [];
  const declarations = [];

  let headerDone = false;

  for (const chunk of chunks) {
    const normalized =
      chunk.trim();

    const isDirective =
      /^(library|import|export|part)\b[\s\S]*;$/i.test(
        normalized
      );

    if (
      !headerDone &&
      isDirective
    ) {
      header.push(
        normalized
      );
    } else {
      headerDone = true;

      declarations.push(
        normalized
      );
    }
  }

  return {
    header,
    declarations,
  };
}

/* ============================================================
   COMPONENT LIBRARY MULTI-FILE BUILDER
   ============================================================ */

function buildComponentLibraryProject(mainCode) {
  const source =
    String(mainCode || "").trim();

  if (!source) {
    throw new Error(
      "mainCode is required."
    );
  }

  /*
   * Small generated apps do not need splitting.
   */

  if (
    source.length <=
    MAX_FILE_CHARS
  ) {
    return {
      files: [
        {
          path: "lib/main.dart",
          content: source,
          language: "dart",
          role: "entrypoint",
        },
      ],

      entrypoint:
        "lib/main.dart",

      source:
        "component-library-single-file",
    };
  }

  const {
    header,
    declarations,
  } =
    extractDartHeader(
      source
    );

  if (
    declarations.length === 0
  ) {
    throw new Error(
      `Component Library generated ${source.length} characters, but no top-level Dart declarations could be split.`
    );
  }

  const libraryName =
    "vibe_generated_app";

  /*
   * Keep imports/exports.
   *
   * Existing library/part directives are intentionally removed
   * because this function creates the canonical library structure.
   */

  const importHeader =
    header.filter(
      (item) =>
        !/^(library|part)\b/i.test(
          item
        )
    );

  const chunks = [];

  let current = [];
  let currentSize = 0;

  /*
   * Keep some safety margin below MAX_FILE_CHARS.
   */

  const maxChunkSize =
    Math.min(
      MAX_FILE_CHARS - 1000,
      45000
    );

  const flush =
    () => {
      if (
        !current.length
      ) {
        return;
      }

      chunks.push(
        current.join(
          "\n\n"
        )
      );

      current = [];
      currentSize = 0;
    };

  for (
    const declaration
    of declarations
  ) {
    /*
     * Never split inside an individual Dart declaration.
     */

    if (
      declaration.length >
      maxChunkSize
    ) {
      throw new Error(
        `Component Library contains a single Dart declaration that is too large to split safely: ${declaration.length} chars.`
      );
    }

    const separatorSize =
      current.length
        ? 2
        : 0;

    if (
      current.length > 0 &&
      currentSize +
        separatorSize +
        declaration.length >
        maxChunkSize
    ) {
      flush();
    }

    current.push(
      declaration
    );

    currentSize +=
      separatorSize +
      declaration.length;
  }

  flush();

  if (
    chunks.length === 0
  ) {
    throw new Error(
      "Component Library produced no Dart declaration chunks."
    );
  }

  /*
   * Main.dart contains:
   *
   * 1. library declaration
   * 2. imports
   * 3. part directives
   *
   * The original main() function stays inside one of the generated
   * part files. Dart compiles the complete library, so main() is
   * still available as the application entrypoint.
   */

  const files = [
    {
      path: "lib/main.dart",

      content: [
        `library ${libraryName};`,

        ...importHeader,

        ...chunks.map(
          (_, index) =>
            `part 'generated/component_${index + 1}.dart';`
        ),
      ].join("\n"),

      language:
        "dart",

      role:
        "entrypoint",
    },
  ];

  /*
   * Create generated part files.
   */

  chunks.forEach(
    (chunk, index) => {
      files.push({
        path:
          `lib/generated/component_${index + 1}.dart`,

        content: [
          `part of ${libraryName};`,
          "",
          chunk,
        ].join("\n"),

        language:
          "dart",

        role:
          "source",
      });
    }
  );

  return {
    files,

    entrypoint:
      "lib/main.dart",

    source:
      "component-library-multi-file",
  };
}

/* ============================================================
   BACKWARD-COMPATIBLE BUILDER
   ============================================================ */

function buildStructuredProject(mainCode) {
  if (
    !mainCode ||
    typeof mainCode !== "string"
  ) {
    throw new Error(
      "mainCode is required."
    );
  }

  return buildComponentLibraryProject(
    mainCode
  );
}

/* ============================================================
   AUTO-SPLIT OVERSIZED lib/main.dart
   ============================================================ */

/**
 * Claude often returns the whole app in one lib/main.dart. When it is
 * larger than MAX_FILE_CHARS the project used to be rejected
 * ("Generated file is too large: lib/main.dart"). Instead, split it
 * into lib/main.dart + lib/generated/component_N.dart part files, the
 * same structure the Component Library builder produces.
 */
function splitOversizedMain(files) {
  if (!Array.isArray(files)) return files;

  const main = files.find(
    (f) => f && f.path === "lib/main.dart"
  );

  if (
    !main ||
    typeof main.content !== "string" ||
    main.content.length <= MAX_FILE_CHARS
  ) {
    return files;
  }

  // Already uses part files: move the oversized body into extra part files.
  if (/^\s*part\s+['"]/m.test(main.content)) {
    return splitOversizedMainWithParts(files, main);
  }

  let split;
  try {
    split = buildComponentLibraryProject(main.content);
  } catch (_) {
    return files;
  }

  if (!split || split.files.length <= 1) {
    return files;
  }

  const others = files.filter(
    (f) =>
      f &&
      f !== main &&
      !/^lib\/generated\/component_\d+\.dart$/.test(f.path)
  );

  return [...split.files, ...others];
}

function splitOversizedMainWithParts(files, main) {
  try {
    const { header, declarations } = extractDartHeader(main.content);

    if (declarations.length === 0) return files;

    const libMatch = header
      .map((h) => /^library\s+([A-Za-z_][\w.]*)\s*;/i.exec(h))
      .find(Boolean);
    const partOf = libMatch
      ? `part of ${libMatch[1]};`
      : "part of '../main.dart';";

    const maxChunk = Math.min(MAX_FILE_CHARS - 1000, 45000);
    const chunks = [];
    let cur = [];
    let size = 0;

    for (const d of declarations) {
      if (d.length > maxChunk) return files;
      if (cur.length && size + d.length + 2 > maxChunk) {
        chunks.push(cur.join("\n\n"));
        cur = [];
        size = 0;
      }
      cur.push(d);
      size += d.length + 2;
    }
    if (cur.length) chunks.push(cur.join("\n\n"));

    const newParts = chunks.map((chunk, i) => ({
      path: `lib/generated/main_split_${i + 1}.dart`,
      content: `${partOf}\n\n${chunk}`,
      language: "dart",
      role: "source",
    }));

    const nonPart = header.filter((h) => !/^part\b/i.test(h));
    const oldParts = header.filter((h) => /^part\b/i.test(h));
    const newPartDirectives = newParts.map(
      (f) => `part '${f.path.replace(/^lib\//, "")}';`
    );

    const newMain = {
      ...main,
      content: [...nonPart, ...oldParts, ...newPartDirectives].join("\n"),
    };

    const rest = files.filter(
      (f) =>
        f &&
        f !== main &&
        !/^lib\/generated\/main_split_\d+\.dart$/.test(f.path)
    );

    return [newMain, ...rest, ...newParts];
  } catch (_) {
    return files;
  }
}

/* ============================================================
   VALIDATE STRUCTURED FILES
   ============================================================ */

function validateStructuredFilesForGeneration(
  files
) {
  files = splitOversizedMain(files);

  const errors = [];

  let normalizedFiles;

  try {
    normalizedFiles =
      normalizeProjectFiles(
        files
      );
  } catch (error) {
    return {
      valid:
        false,

      errors: [
        error.message,
      ],

      files: [],
    };
  }

  const fileMap =
    new Map(
      normalizedFiles.map(
        (file) => [
          file.path,
          file,
        ]
      )
    );

  if (
    !fileMap.has(
      "lib/main.dart"
    )
  ) {
    errors.push(
      "Generated project is missing lib/main.dart."
    );
  }

  for (
    const file
    of normalizedFiles
  ) {
    if (
      file.path.endsWith(
        ".dart"
      )
    ) {
      const syntax =
        checkFlutterCodeSyntax(
          file.content,
          { requireEntrypoint: false }
        );

      if (
        syntax &&
        syntax.valid === false
      ) {
        const details =
          syntax.errors ||
          syntax.message ||
          "Dart syntax validation failed.";

        errors.push(
          `${file.path}: ${details}`
        );
      }
    }
  }

  // main() / runApp() only need to exist once in the whole project
  // (Component Library part files keep them in a generated part).
  if (errors.length === 0) {
    const combined = normalizedFiles
      .filter((f) => f.path.endsWith(".dart"))
      .map((f) => f.content)
      .join("\n\n");

    const projectCheck = checkFlutterCodeSyntax(combined);

    if (projectCheck && projectCheck.valid === false) {
      errors.push(
        `Project: ${(projectCheck.errors || []).join(" ")}`
      );
    }
  }

  return {
    valid:
      errors.length === 0,

    errors,

    files:
      normalizedFiles,
  };
}

/* ============================================================
   GENERATE STRUCTURED FLUTTER PROJECT
   ============================================================ */

async function generateStructuredFlutterProject({
  prompt,
  appSpec,
  supabaseConfig = null,
}) {
  if (!STRUCTURED_ENABLED) {
    throw new Error(
      "Structured Flutter generation is disabled."
    );
  }

  const systemPrompt = `
You are the senior Flutter architecture and code generation engine for VibeApp.

Generate a COMPLETE production-ready Flutter application from the user's request.

IMPORTANT ARCHITECTURE RULES:

1. Do NOT put the entire application into lib/main.dart.

2. Use a clean multi-file architecture.

3. lib/main.dart must be a small application entrypoint.

4. Use appropriate directories such as:
   - lib/app/
   - lib/models/
   - lib/screens/
   - lib/widgets/
   - lib/services/
   - lib/providers/
   - lib/controllers/
   - lib/repositories/
   - lib/utils/
   - lib/constants/
   - lib/config/

5. Only create directories/files that are actually required.

6. Keep related logic together.

7. Do not create unnecessary duplicate files.

8. Every generated file must contain complete valid code.

9. Imports must be correct.

10. Navigation must point to real screens.

11. Models, services, providers/controllers and UI must be consistent.

12. Do not generate placeholder implementations when the user explicitly requested real functionality.

13. If Supabase configuration is provided, integrate it into the correct service/repository/authentication layer.

14. Preserve all requested functionality.

15. Do not remove requested functionality merely to simplify the implementation.

16. Keep the project compatible with Flutter Android and Web.

17. If a dependency is required, include the required dependency information in pubspec.yaml.

18. Do not reference files that are not returned.

19. Every import path must match an actual returned file.

20. Return the COMPLETE contents of every generated file.

RETURN ONLY VALID JSON.

JSON FORMAT:

{
  "files": [
    {
      "path": "lib/main.dart",
      "content": "...",
      "language": "dart",
      "role": "entrypoint"
    }
  ],
  "entrypoint": "lib/main.dart"
}

The response must contain the complete contents of every file.
`.trim();

  const userPrompt = `
USER REQUEST:

${prompt}

APPLICATION SPECIFICATION:

${JSON.stringify(
  appSpec || {},
  null,
  2
)}

SUPABASE CONFIGURATION:

${JSON.stringify(
  supabaseConfig || null,
  null,
  2
)}

Generate the complete Flutter project now.
`.trim();

  /*
   * IMPORTANT:
   *
   * claudeCodeService.callClaude() expects:
   *
   * callClaude(messages, options)
   *
   * NOT:
   *
   * callClaude({ system, prompt, maxTokens })
   *
   * This fixes:
   *
   * messages.0.content: Input should be a valid array
   */

  const response =
    await callClaude(
      [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      {
        system:
          systemPrompt,

        max_tokens:
          100000,
      }
    );

  if (
    !response ||
    typeof response.content !== "string" ||
    !response.content.trim()
  ) {
    throw new Error(
      "Claude returned empty content for structured Flutter generation."
    );
  }

  const parsed =
    extractJson(
      response.content
    );

  if (
    !parsed ||
    !Array.isArray(
      parsed.files
    )
  ) {
    throw new Error(
      "Claude returned an invalid structured Flutter project."
    );
  }

  const validation =
    validateStructuredFilesForGeneration(
      parsed.files
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Generated Flutter project validation failed:\n${validation.errors.join(
        "\n"
      )}`
    );
  }

  return {
    files:
      validation.files,

    entrypoint:
      parsed.entrypoint ||
      "lib/main.dart",

    source:
      "claude-sonnet-multifile",

    model:
      response.model,

    usage:
      response.usage,

    stopReason:
      response.stopReason,
  };
}

/* ============================================================
   EDIT STRUCTURED PROJECT WITH CLAUDE
   ============================================================ */

async function editStructuredProjectWithClaude({
  prompt,
  files,
  appSpec = null,
  supabaseConfig = null,
}) {
  if (!Array.isArray(files)) {
    throw new Error(
      "Existing project files are required."
    );
  }

  if (!String(prompt || "").trim()) {
    throw new Error(
      "Edit prompt is required."
    );
  }

  const normalizedFiles =
    normalizeProjectFiles(
      files
    );

  const systemPrompt = `
You are the senior Flutter change-management engine for VibeApp.

You are modifying an EXISTING Flutter application.

CRITICAL RULE:

Do not rebuild the entire application from scratch unless absolutely necessary.

The existing project is authoritative.

Preserve existing functionality unless the user explicitly asks to remove or replace it.

The user's requested change has highest priority.

You may:

- modify existing files
- create new files
- delete files if explicitly required
- rename files when required
- update navigation
- update models
- update services
- update repositories
- update state management
- update providers/controllers
- update widgets
- update screens
- update validation
- update API integration
- update Supabase integration
- update dependencies when required

Always keep imports valid.

Always keep references valid.

Do not leave dead imports.

Do not create duplicate implementations.

Do not put the whole application into main.dart.

Do not destroy working unrelated functionality.

If the requested change requires a new file, create it.

If the requested change requires deleting or replacing an old file, do it.

If the requested change affects multiple files, update every affected file.

Return the COMPLETE updated project file set.

RETURN ONLY VALID JSON.

FORMAT:

{
  "files": [
    {
      "path": "lib/main.dart",
      "content": "...",
      "language": "dart",
      "role": "entrypoint"
    }
  ],
  "entrypoint": "lib/main.dart"
}

The returned files must represent the complete final project, not only changed files.
`.trim();

  const userPrompt = `
REQUESTED CHANGE:

${prompt}

CURRENT APPLICATION SPECIFICATION:

${JSON.stringify(
  appSpec || {},
  null,
  2
)}

SUPABASE CONFIGURATION:

${JSON.stringify(
  supabaseConfig || null,
  null,
  2
)}

CURRENT PROJECT:

${projectToPrompt(
  normalizedFiles
)}

Apply the requested changes while preserving all unrelated existing functionality.

Return the COMPLETE updated project.

Do not return a patch.
Do not return only changed files.
Do not use ellipsis.
Do not omit unchanged files.
`.trim();

  /*
   * FIX:
   *
   * callClaude expects:
   *   callClaude(messages, options)
   *
   * The previous implementation passed an object:
   *
   *   callClaude({
   *      system,
   *      prompt,
   *      maxTokens
   *   })
   *
   * which caused:
   *
   *   Claude API 400:
   *   messages.0.content:
   *   Input should be a valid array
   */

  const response =
    await callClaude(
      [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      {
        system:
          systemPrompt,

        max_tokens:
          100000,
      }
    );

  if (
    !response ||
    typeof response.content !== "string" ||
    !response.content.trim()
  ) {
    throw new Error(
      "Claude returned empty content while editing the Flutter project."
    );
  }

  const parsed =
    extractJson(
      response.content
    );

  if (
    !parsed ||
    !Array.isArray(
      parsed.files
    )
  ) {
    throw new Error(
      "Claude returned an invalid edited Flutter project."
    );
  }

  const validation =
    validateStructuredFilesForGeneration(
      parsed.files
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Edited Flutter project validation failed:\n${validation.errors.join(
        "\n"
      )}`
    );
  }

  return {
    files:
      validation.files,

    entrypoint:
      parsed.entrypoint ||
      "lib/main.dart",

    source:
      "claude-sonnet-multifile-edit",

    model:
      response.model,

    usage:
      response.usage,

    stopReason:
      response.stopReason,
  };
}

/* ============================================================
   REPAIR STRUCTURED PROJECT
   ============================================================ */

async function repairStructuredProject({
  prompt,
  files,
  errors,
  appSpec = null,
  supabaseConfig = null,
}) {
  if (!Array.isArray(files)) {
    throw new Error(
      "Project files are required for structured repair."
    );
  }

  const normalizedFiles =
    normalizeProjectFiles(
      files
    );

  const systemPrompt = `
You are the senior Flutter repair engine for VibeApp.

Repair the existing Flutter project.

IMPORTANT:

Do not redesign the application.

Do not remove functionality.

Do not replace the architecture unnecessarily.

Fix the reported build, syntax, import, dependency, type, routing, and runtime-related code errors.

Preserve all existing working functionality.

Only make changes required to produce a valid working Flutter project.

If the error requires changing multiple files, update all affected files.

If a missing file is required, create it.

If an invalid file must be replaced, return the corrected version.

Return the COMPLETE corrected project file set.

RETURN ONLY VALID JSON.

FORMAT:

{
  "files": [
    {
      "path": "lib/main.dart",
      "content": "...",
      "language": "dart",
      "role": "entrypoint"
    }
  ],
  "entrypoint": "lib/main.dart"
}

The returned files must represent the complete final project.
`.trim();

  const userPrompt = `
ORIGINAL REQUEST:

${prompt || "(not provided)"}

APPLICATION SPEC:

${JSON.stringify(
  appSpec || {},
  null,
  2
)}

SUPABASE CONFIG:

${JSON.stringify(
  supabaseConfig || null,
  null,
  2
)}

BUILD / VALIDATION ERRORS:

${
  Array.isArray(errors)
    ? errors.join("\n")
    : String(errors || "")
}

CURRENT PROJECT:

${projectToPrompt(
  normalizedFiles
)}

Repair the project while preserving its intended functionality.

Return the COMPLETE corrected project.

Do not return a patch.
Do not return only changed files.
Do not use ellipsis.
Do not omit unchanged files.
`.trim();

  /*
   * IMPORTANT:
   *
   * Structured repair also uses the same correct Claude API
   * messages format.
   */

  const response =
    await callClaude(
      [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      {
        system:
          systemPrompt,

        max_tokens:
          100000,
      }
    );

  if (
    !response ||
    typeof response.content !== "string" ||
    !response.content.trim()
  ) {
    throw new Error(
      "Claude returned empty content during structured Flutter repair."
    );
  }

  const parsed =
    extractJson(
      response.content
    );

  if (
    !parsed ||
    !Array.isArray(
      parsed.files
    )
  ) {
    throw new Error(
      "Claude returned an invalid repaired Flutter project."
    );
  }

  const validation =
    validateStructuredFilesForGeneration(
      parsed.files
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Repaired Flutter project validation failed:\n${validation.errors.join(
        "\n"
      )}`
    );
  }

  return {
    files:
      validation.files,

    entrypoint:
      parsed.entrypoint ||
      "lib/main.dart",

    source:
      "claude-sonnet-multifile-repair",

    model:
      response.model,

    usage:
      response.usage,

    stopReason:
      response.stopReason,
  };
}

/* ============================================================
   FILE MANIFEST
   ============================================================ */

function filesToManifest(files) {
  const normalized =
    normalizeProjectFiles(
      files
    );

  return normalized.map(
    (file) => ({
      path:
        file.path,

      language:
        file.language,

      role:
        file.role,

      size:
        file.content.length,
    })
  );
}

/* ============================================================
   MATERIALIZE PROJECT FILES
   ============================================================ */

function materializeProjectFiles(
  files,
  destinationDir
) {
  const normalized =
    normalizeProjectFiles(
      files
    );

  fs.mkdirSync(
    destinationDir,
    {
      recursive: true,
    }
  );

  for (
    const file
    of normalized
  ) {
    const targetPath =
      path.join(
        destinationDir,
        file.path
      );

    const resolvedRoot =
      path.resolve(
        destinationDir
      );

    const resolvedTarget =
      path.resolve(
        targetPath
      );

    if (
      resolvedTarget !==
        resolvedRoot &&
      !resolvedTarget.startsWith(
        `${resolvedRoot}${path.sep}`
      )
    ) {
      throw new Error(
        `Refusing to write file outside project directory: ${file.path}`
      );
    }

    fs.mkdirSync(
      path.dirname(
        targetPath
      ),
      {
        recursive: true,
      }
    );

    fs.writeFileSync(
      targetPath,
      file.content,
      "utf8"
    );
  }

  return normalized;
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  STRUCTURED_ENABLED,

  safeProjectPath,

  normalizeProjectFiles,

  fixDartDirectiveOrder,

  validateStructuredFilesForGeneration,

  extractJson,

  projectToPrompt,

  buildStructuredProject,

  generateStructuredFlutterProject,

  editStructuredProjectWithClaude,

  repairStructuredProject,

  filesToManifest,

  materializeProjectFiles,
};