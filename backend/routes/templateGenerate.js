const express = require("express");

const {
  generateExact500CrudTemplate,
  findBestTemplate,
} = require("../services/exact500AppTemplates");

const {
  sanitizeGeneratedFlutterCode,
} = require("../services/exact500AppTemplates/flutterCodeSafety");

const {
  generateFlutterCode,
} = require("../services/aiService");

const {
  generateCustomFlutterCode,
  editFlutterCodeWithClaude,
  selfHealGenerationFailure,
  getValidationDetails,
} = require("../services/claudeCodeService");

const {
  buildFlutterCrudApp,
} = require("../services/exact500AppTemplates/uniqueFlutterCrudFactory");

const {
  buildFlutterSupabaseCrudApp,
} = require("../services/exact500AppTemplates/supabaseCrudFactory");

const {
  analyzeAppPrompt,
} = require("../services/aiTemplateRouter");

const {
  normalizeAppSpec,
} = require("../services/appSpec");

const {
  planApplication,
} = require("../services/ai/componentPlanner");

const {
  normalizeUiPreset,
  inferUiPresetFromPrompt,
} = require("../services/uiPresets");

const {
  buildStructuredProject,
  generateStructuredFlutterProject,
  filesToManifest,
} = require("../services/flutterProjectStructure");

const {
  getContextAwarePlan,
} = require("../services/contextAwareAppPlanner");

const {
  buildContextAwareFlutterApp,
} = require("../services/contextAwareFlutterFactory");

const {
  buildArchitectBlueprint,
} = require("../services/ai/appArchitectAgent");

const {
  buildWorkspaceComponentSpec,
} = require("../services/ai/workspaceComponentSpec");

const {
  buildMultiEntityFlutterApp,
} = require("../services/multiEntityFlutterCompiler");

const auth = require("../middleware/authMiddleware");

const {
  createRateLimiter,
} = require("../middleware/rateLimit");

const router = express.Router();

const generationLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 12,
  prefix: "template-generation",
});

const SUPPORTED_EXAMPLES = [
  "Create a blue student management app with name, age, phone and course fields",
  "Build a black and gold notepad app",
  "Create product inventory app in grid view with name, stock, price and category fields",
  "Create appointment booking CRUD app with patient name, date, phone and status fields",
  "Create expense tracker app with amount, category, date and notes fields",
];

const CRUD_SCOPE_MESSAGE =
  "This request is outside VibeApp's current supported CRUD app generation scope.";

const EMPTY_PROMPT_MESSAGE =
  "Please describe the Flutter CRUD app you want to create.";

const EXTERNAL_FEATURE_MESSAGE =
  "VibeApp can generate Flutter CRUD apps, but external integrations such as Firebase, Supabase, payments, maps, camera, push notifications, PDF/Excel export, or backend database setup are not supported in this version.";

const TOO_COMPLEX_MESSAGE =
  "This app idea is too large to generate in one go. Break it into smaller pieces — for example, start with just the core record-management screen, then add features one at a time using the chat editor.";


/* ============================================================
   CLAUDE / SONNET ROUTING
   ============================================================ */

const SIMPLE_LIBRARY_DOMAIN_WORDS = [
  "hospital",
  "clinic",

  "student",
  "school",
  "college",
  "university",

  "patient",
  "doctor",
  "pharmacy",

  "inventory",
  "warehouse",
  "stock",

  "product",
  "products",

  "expense",
  "expenses",

  "task",
  "tasks",
  "todo",

  "customer",
  "customers",

  "employee",
  "employees",
  "staff",

  "teacher",
  "teachers",

  "appointment",
  "appointments",

  "booking",
  "bookings",

  "restaurant",
  "cafe",
  "hotel",

  "library",
  "books",

  "gym",
  "fitness",

  "crm",
  "sales",

  "invoice",
  "invoices",

  "vendor",
  "vendors",

  "property",
  "properties",

  "project",
  "projects",

  "event",
  "events",

  "payroll",
  "hr",

  "leave",

  "members",
  "membership",

  "contacts",
  "notes",

  "recipes",

  "habit",
  "habits",

  "attendance",

  "fees",
  "fee",

  "billing",
  "accounting",
];

const CUSTOM_REQUIREMENT_MARKERS = [
  "with",
  "include",
  "including",

  "feature",
  "features",

  "function",
  "functions",
  "functionality",

  "require",
  "requires",
  "required",
  "requirement",

  "field",
  "fields",

  "screen",
  "screens",

  "page",
  "pages",

  "role",
  "roles",

  "permission",
  "permissions",

  "workflow",
  "workflows",

  "calculator",
  "calculate",
  "calculation",

  "stopwatch",
  "timer",

  "converter",

  "quiz",
  "game",

  "tool",
  "utility",
];

function isSimpleLibraryPrompt(prompt = "") {
  const cleaned = String(prompt || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return false;
  }

  const words = cleaned.split(/\s+/);

  if (words.length > 8) {
    return false;
  }

  for (const marker of CUSTOM_REQUIREMENT_MARKERS) {
    if (
      words.includes(marker) ||
      cleaned.includes(` ${marker} `)
    ) {
      return false;
    }
  }

  if (/[,;:]/.test(cleaned)) {
    return false;
  }

  const hasDomain =
    SIMPLE_LIBRARY_DOMAIN_WORDS.some(
      (domain) => words.includes(domain)
    );

  if (!hasDomain) {
    return false;
  }

  const hasManagementIntent =
    /management|manager|manage|crud|tracker|tracking|records|record|catalog|inventory|booking|appointments|billing|attendance|system|app|application/i.test(
      cleaned
    );

  return hasManagementIntent;
}


/* ============================================================
   EXISTING COMPLEXITY DETECTION
   ============================================================ */

const COMPLEXITY_SIGNALS = [
  "multiple screens",
  "multiple pages",
  "many screens",
  "many pages",
  "full app",
  "complete app",
  "entire app",
  "whole app",
  "all features",
  "all modules",
  "all screens",
  "multi-module",
  "multimodule",
  "multi module",

  "admin panel",
  "admin dashboard",
  "admin portal",
  "user roles",
  "role-based",
  "role based",
  "permissions system",
  "super admin",
  "multi user",
  "multiuser",

  "multi-vendor",
  "super admin",

  "home screen",
];

function countScreenMentions(text) {
  const matches = text.match(
    /\b\w+\s+(screen|page|view|panel|dashboard|module)\b/gi
  );

  return matches ? matches.length : 0;
}

function isTooBigPrompt(prompt = "") {
  const text = prompt.toLowerCase();

  for (const signal of COMPLEXITY_SIGNALS) {
    if (text.includes(signal)) {
      return true;
    }
  }

  if (countScreenMentions(text) >= 4) {
    return true;
  }

  return false;
}


/* ============================================================
   EMPTY PROMPT DETECTION
   ============================================================ */

function cleanPrompt(prompt = "") {
  return String(prompt || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmptyPrompt(prompt = "") {
  return !cleanPrompt(prompt);
}


/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

function buildUnsupportedResponse(prompt, extra = {}) {
  return {
    success: false,
    unsupported: true,
    shouldFallback: false,
    type: "unsupported_prompt",
    message: EMPTY_PROMPT_MESSAGE,
    prompt,
    suggestions: SUPPORTED_EXAMPLES,
    ...extra,
  };
}

function buildTooComplexResponse(prompt, extra = {}) {
  return {
    success: false,
    unsupported: true,
    shouldFallback: false,
    type: "too_complex",
    message: TOO_COMPLEX_MESSAGE,
    prompt,
    suggestions: SUPPORTED_EXAMPLES,
    ...extra,
  };
}

function buildExternalFeatureResponse(prompt, extra = {}) {
  return {
    success: false,
    unsupported: true,
    shouldFallback: false,
    type: "external_feature",
    message: EXTERNAL_FEATURE_MESSAGE,
    prompt,
    suggestions: SUPPORTED_EXAMPLES,
    ...extra,
  };
}


/* ============================================================
   EXTERNAL FEATURE DETECTION
   ============================================================ */

function containsExternalFeature(prompt = "") {
  const text = String(prompt || "").toLowerCase();

  const externalFeatures = [
    "firebase",
    "supabase",
    "payment",
    "payments",
    "stripe",
    "paypal",
    "maps",
    "google maps",
    "camera",
    "push notification",
    "push notifications",
    "notification",
    "notifications",
    "pdf export",
    "excel export",
    "csv export",
    "backend database",
    "database setup",
    "api integration",
    "rest api",
    "authentication server",
    "cloud storage",
  ];

  return externalFeatures.some(
    (feature) => text.includes(feature)
  );
}


/* ============================================================
   JSON / AI RESPONSE HELPERS
   ============================================================ */

function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  const text = String(value).trim();

  try {
    return JSON.parse(text);
  } catch (_) {
    // Continue with extraction.
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (
    firstBrace >= 0 &&
    lastBrace > firstBrace
  ) {
    try {
      return JSON.parse(
        text.slice(
          firstBrace,
          lastBrace + 1
        )
      );
    } catch (_) {
      return null;
    }
  }

  return null;
}

function normalizePromptResult(result) {
  if (!result) {
    return null;
  }

  if (typeof result === "object") {
    return result;
  }

  return safeJsonParse(result);
}


/* ============================================================
   GROQ SPECIFICATION
   ============================================================ */

/*
 * IMPORTANT:
 *
 * The existing VibeApp Groq integration is:
 *
 *     analyzeAppPrompt()
 *
 * imported from:
 *
 *     ../services/aiTemplateRouter
 *
 * DO NOT dynamically search for a "groqService".
 *
 * This function intentionally keeps the existing Groq
 * implementation as the single source of the application
 * specification.
 */

async function getGroqAppSpec(prompt) {
  console.log(
    "[Groq] Starting application specification generation..."
  );

  const result =
    await analyzeAppPrompt(prompt);

  const normalized =
    normalizePromptResult(result);

  if (!normalized) {
    throw new Error(
      "Groq returned an empty or invalid application specification."
    );
  }

  console.log(
    "[Groq] Application specification successfully prepared."
  );

  return normalized;
}


/* ============================================================
   INITIAL GENERATION SELF-HEALING
   ============================================================ */

async function recoverInitialGeneration({
  prompt,
  error,
  partialCode = "",
  supabaseConfig = null,
  appSpec = null,
}) {
  const normalizedError =
    String(error || "").trim();

  const normalizedCode =
    String(partialCode || "").trim();

  console.warn(
    "Initial generation failed. Starting Claude/Sonnet self-healing recovery.",
    normalizedError
  );

  const recoveredCode =
    await selfHealGenerationFailure({
      prompt,
      error: normalizedError,
      partialCode: normalizedCode,
      supabaseConfig,
      appSpec,
      attempt: 1,
    });

  const validation =
    getValidationDetails(
      recoveredCode,
      "self-healed Flutter generation"
    );

  if (!validation.valid) {
    throw new Error(
      `Claude self-healing returned invalid Flutter code: ${validation.errors.join(", ")}`
    );
  }

  return validation.clean;
}


/* ============================================================
   DIRECT MULTI-FILE CLAUDE GENERATION
   ============================================================ */

async function generateCustomStructuredProject({
  prompt,
  appSpec,
  supabaseConfig = null,
}) {
  if (!appSpec) {
    throw new Error(
      "Groq application specification is required before Claude/Sonnet generation."
    );
  }

  console.log(
    "[Claude/Sonnet] Starting direct multi-file Flutter generation..."
  );

  const result =
    await generateStructuredFlutterProject({
      prompt,
      appSpec,
      supabaseConfig,
    });

  if (
    !result ||
    !Array.isArray(result.files) ||
    result.files.length === 0
  ) {
    throw new Error(
      "Claude/Sonnet did not return a valid multi-file Flutter project."
    );
  }

  const entrypoint =
    result.entrypoint ||
    "lib/main.dart";

  const mainFile =
    result.files.find(
      (file) =>
        file.path === entrypoint ||
        file.path === "lib/main.dart"
    );

  if (!mainFile || !mainFile.content) {
    throw new Error(
      "Claude/Sonnet multi-file project does not contain lib/main.dart."
    );
  }

  console.log(
    `[Claude/Sonnet] Multi-file Flutter project generated successfully: ${result.files.length} files`
  );

  return {
    ...result,
    entrypoint,
    files: result.files,
  };
}


/* ============================================================
   ROUTE: HYBRID GENERATE
   ============================================================ */

router.post(
  "/hybrid-generate",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(finalPrompt)
      ) {
        return res.status(200).json(
          buildUnsupportedResponse(
            finalPrompt
          )
        );
      }


      /* ======================================================
         SIMPLE MANAGEMENT PROMPT
         -> COMPONENT LIBRARY
         ====================================================== */

      if (
        isSimpleLibraryPrompt(
          finalPrompt
        )
      ) {
        try {
          console.log(
            `Routing simple management prompt to component library: "${finalPrompt}"`
          );

          const libraryResult =
            generateExact500CrudTemplate(
              finalPrompt
            );

          if (
            libraryResult &&
            libraryResult.success &&
            libraryResult.code
          ) {
            const code =
              sanitizeGeneratedFlutterCode(
                libraryResult.code
              );

            /*
             * IMPORTANT FIX:
             *
             * buildStructuredProject() accepts
             * mainCode as a STRING.
             *
             * Do NOT pass an object here.
             */

            const structured =
              buildStructuredProject(code);

            return res.json({
              success: true,

              code,

              generatedCode:
                code,

              projectFiles:
                structured.files,

              fileManifest:
                filesToManifest(
                  structured.files
                ),

              entrypoint:
                structured.entrypoint ||
                "lib/main.dart",

              source:
                "component-library-simple-prompt",

              unsupported:
                false,

              shouldFallback:
                false,

              storageMode:
                "local",

              appConfig:
                libraryResult.meta?.rawTemplate ||
                libraryResult.meta ||
                null,

              meta: {
                ...(libraryResult.meta || {}),

                generationRoute:
                  "component-library",

                simplePrompt:
                  true,
              },
            });
          }

        } catch (libraryError) {
          console.error(
            "[VibeApp] Component Library generation failed. Claude fallback is disabled for simple library prompts:",
            libraryError.message
          );

          return res.status(503).json({
            success: false,
            unsupported: false,
            shouldFallback: false,
            type:
              "component_library_generation_error",
            message:
              libraryError.message ||
              "The requested standard application could not be generated from the Component Library.",
            reason:
              "This prompt was classified as a standard Component Library application. Groq and Claude fallback are intentionally disabled.",
            source:
              "component-library-simple-prompt",
            claudeUsed:
              false,
            groqUsed:
              false,
            generationRoute:
              "component-library",
          });
        }
      }


      /* ======================================================
         CUSTOM / DETAILED / UTILITY PROMPT
         -> GROQ -> CLAUDE / SONNET
         ====================================================== */

      console.log(
        "=================================================="
      );

      console.log(
        "[VibeApp] HYBRID GENERATION"
      );

      console.log(
        `Prompt: ${finalPrompt}`
      );

      console.log(
        "Route: CUSTOM / GROQ / CLAUDE"
      );

      console.log(
        "Supabase: disabled"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "[VibeApp] Starting Groq specification generation..."
      );

      let groqAppSpec = null;

      try {
        groqAppSpec =
          await getGroqAppSpec(
            finalPrompt
          );

        console.log(
          "[Groq] Specification generation completed."
        );

        console.log(
          "[Groq] Specification will now be passed to Claude/Sonnet."
        );

      } catch (groqError) {
        console.error(
          "[Groq] Specification generation failed:",
          groqError
        );

        return res.status(503).json({
          success: false,

          unsupported:
            false,

          shouldFallback:
            false,

          type:
            "groq_specification_error",

          message:
            groqError.message ||
            "Groq could not generate the application specification.",

          reason:
            "The Groq specification layer is required before Claude/Sonnet custom generation.",

          suggestions:
            SUPPORTED_EXAMPLES,
        });
      }


      /* ======================================================
         CLAUDE / SONNET DIRECT MULTI-FILE GENERATION
         ====================================================== */

      try {
        console.log(
          "[VibeApp] Passing Groq JSON specification to Claude/Sonnet..."
        );

        const structured =
          await generateCustomStructuredProject({
            prompt:
              finalPrompt,

            appSpec:
              groqAppSpec,

            supabaseConfig:
              null,
          });

        const entrypoint =
          structured.entrypoint ||
          "lib/main.dart";

        const mainFile =
          structured.files.find(
            (file) =>
              file.path === entrypoint ||
              file.path === "lib/main.dart"
          );

        const code =
          mainFile?.content || "";

        if (!code) {
          throw new Error(
            "Generated structured Flutter project has no main.dart content."
          );
        }

        console.log(
          "=================================================="
        );

        console.log(
          "[VibeApp] HYBRID GENERATION SUCCESS"
        );

        console.log(
          `[VibeApp] Generated ${structured.files.length} Flutter project files.`
        );

        console.log(
          "[VibeApp] Groq -> Claude -> Multi-file Flutter complete."
        );

        console.log(
          "=================================================="
        );

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            entrypoint,

          source:
            "groq-claude-multifile",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "local",

          appSpec:
            groqAppSpec,

          meta: {
            generationRoute:
              "groq-claude",

            groqUsed:
              true,

            claudeUsed:
              true,

            multiFile:
              true,

            fileCount:
              structured.files.length,
          },
        });

      } catch (claudeError) {
        console.error(
          "[VibeApp] Claude/Sonnet structured generation failed:",
          claudeError
        );

        /*
         * Custom prompts are allowed to use targeted
         * Claude self-healing.
         *
         * This is NOT the same as the Component Library
         * fallback. Simple library prompts never reach
         * this section.
         */

        try {
          const recoveredCode =
            await recoverInitialGeneration({
              prompt:
                finalPrompt,

              error:
                claudeError.message,

              partialCode:
                claudeError.partialCode ||
                "",

              supabaseConfig:
                null,

              appSpec:
                groqAppSpec,
            });

          const structuredRecovery =
            buildStructuredProject(
              recoveredCode
            );

          return res.json({
            success:
              true,

            code:
              recoveredCode,

            generatedCode:
              recoveredCode,

            projectFiles:
              structuredRecovery.files,

            fileManifest:
              filesToManifest(
                structuredRecovery.files
              ),

            entrypoint:
              structuredRecovery.entrypoint ||
              "lib/main.dart",

            source:
              "groq-claude-self-healed",

            unsupported:
              false,

            shouldFallback:
              false,

            storageMode:
              "local",

            appSpec:
              groqAppSpec,

            meta: {
              generationRoute:
                "groq-claude-self-healed",

              groqUsed:
                true,

              claudeUsed:
                true,

              selfHealed:
                true,

              multiFile:
                false,
            },
          });

        } catch (recoveryError) {
          console.error(
            "[VibeApp] Claude self-healing failed:",
            recoveryError
          );

          return res.status(500).json({
            success:
              false,

            unsupported:
              false,

            shouldFallback:
              false,

            type:
              "claude_generation_error",

            message:
              claudeError.message ||
              "Claude/Sonnet could not generate the requested Flutter application.",

            recoveryError:
              recoveryError.message,

            source:
              "groq-claude",
          });
        }
      }

    } catch (error) {
      console.error(
        "Hybrid generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Hybrid Flutter generation failed.",
      });
    }
  }
);


/* ============================================================
   TEMPLATE ROUTE
   ============================================================ */

router.post(
  "/template",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        template,
        uiPreset,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      if (
        isTooBigPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json(
          buildTooComplexResponse(
            finalPrompt
          )
        );
      }

      if (
        containsExternalFeature(
          finalPrompt
        )
      ) {
        return res.status(400).json(
          buildExternalFeatureResponse(
            finalPrompt
          )
        );
      }

      const result =
        generateExact500CrudTemplate(
          finalPrompt,
          template
        );

      if (
        result &&
        result.success &&
        result.code
      ) {
        const code =
          sanitizeGeneratedFlutterCode(
            result.code
          );

        const structured =
          buildStructuredProject(code);

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            structured.entrypoint ||
            "lib/main.dart",

          source:
            "component-library",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "local",

          appConfig:
            result.meta?.rawTemplate ||
            result.meta ||
            null,

          meta: {
            ...(result.meta || {}),

            generationRoute:
              "component-library",

            uiPreset:
              uiPreset ||
              inferUiPresetFromPrompt(
                finalPrompt
              ),
          },
        });
      }

      return res.status(400).json({
        success:
          false,

        unsupported:
          true,

        message:
          CRUD_SCOPE_MESSAGE,

        suggestions:
          SUPPORTED_EXAMPLES,
      });

    } catch (error) {
      console.error(
        "Template generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Template generation failed.",
      });
    }
  }
);


/* ============================================================
   FIND TEMPLATE
   ============================================================ */

router.post(
  "/find-template",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      const result =
        findBestTemplate(
          finalPrompt
        );

      return res.json({
        success:
          true,

        result,
      });

    } catch (error) {
      console.error(
        "Find template error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Template search failed.",
      });
    }
  }
);


/* ============================================================
   AI GENERATE
   ============================================================ */

router.post(
  "/ai-generate",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        appSpec,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      if (
        isTooBigPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json(
          buildTooComplexResponse(
            finalPrompt
          )
        );
      }

      if (
        containsExternalFeature(
          finalPrompt
        )
      ) {
        return res.status(400).json(
          buildExternalFeatureResponse(
            finalPrompt
          )
        );
      }

      const result =
        await generateFlutterCode(
          finalPrompt,
          appSpec
        );

      if (
        result &&
        result.code
      ) {
        const code =
          sanitizeGeneratedFlutterCode(
            result.code
          );

        const structured =
          buildStructuredProject(code);

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            structured.entrypoint ||
            "lib/main.dart",

          source:
            "ai-generator",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "local",

          meta:
            result.meta ||
            {},
        });
      }

      return res.status(400).json({
        success:
          false,

        unsupported:
          true,

        message:
          CRUD_SCOPE_MESSAGE,

        suggestions:
          SUPPORTED_EXAMPLES,
      });

    } catch (error) {
      console.error(
        "AI generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "AI Flutter generation failed.",
      });
    }
  }
);


/* ============================================================
   ANALYZE ROUTE
   ============================================================ */

router.post(
  "/analyze",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      const result =
        await analyzeAppPrompt(
          finalPrompt
        );

      return res.json({
        success:
          true,

        spec:
          normalizeAppSpec(
            normalizePromptResult(
              result
            )
          ),
      });

    } catch (error) {
      console.error(
        "Analyze prompt error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Prompt analysis failed.",
      });
    }
  }
);


/* ============================================================
   PLAN ROUTE
   ============================================================ */

router.post(
  "/plan",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        spec,
      } = req.body || {};

      const source =
        spec ||
        prompt;

      if (!source) {
        return res.status(400).json({
          success:
            false,

          message:
            "Prompt or specification is required.",
        });
      }

      const result =
        await planApplication(
          source
        );

      return res.json({
        success:
          true,

        plan:
          result,
      });

    } catch (error) {
      console.error(
        "Application planning error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Application planning failed.",
      });
    }
  }
);


/* ============================================================
   UI PRESET ROUTE
   ============================================================ */

router.post(
  "/ui-preset",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        preset,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      const resolvedPreset =
        normalizeUiPreset(
          preset ||
          inferUiPresetFromPrompt(
            finalPrompt
          )
        );

      return res.json({
        success:
          true,

        uiPreset:
          resolvedPreset,
      });

    } catch (error) {
      console.error(
        "UI preset error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "UI preset processing failed.",
      });
    }
  }
);


/* ============================================================
   SUPABASE GENERATE
   ============================================================ */

router.post(
  "/supabase-generate",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        supabaseConfig,
        appSpec,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      const result =
        buildFlutterSupabaseCrudApp(
          finalPrompt,
          {
            supabaseConfig:
              supabaseConfig ||
              {},

            appSpec:
              appSpec ||
              null,
          }
        );

      if (
        result &&
        result.code
      ) {
        const code =
          sanitizeGeneratedFlutterCode(
            result.code
          );

        const structured =
          buildStructuredProject(
            code
          );

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            structured.entrypoint ||
            "lib/main.dart",

          source:
            "supabase-crud-factory",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "supabase",

          supabaseConfig:
            supabaseConfig ||
            {},

          appSpec:
            appSpec ||
            null,

          meta:
            result.meta ||
            {},
        });
      }

      return res.status(400).json({
        success:
          false,

        unsupported:
          true,

        message:
          CRUD_SCOPE_MESSAGE,

        suggestions:
          SUPPORTED_EXAMPLES,
      });

    } catch (error) {
      console.error(
        "Supabase generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Supabase Flutter generation failed.",
      });
    }
  }
);


/* ============================================================
   MULTI ENTITY GENERATION
   ============================================================ */

router.post(
  "/multi-entity-generate",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        spec,
      } = req.body || {};

      const source =
        spec ||
        prompt;

      if (!source) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      if (
        typeof source === "string" &&
        isTooBigPrompt(
          source
        )
      ) {
        return res.status(400).json(
          buildTooComplexResponse(
            source
          )
        );
      }

      if (
        typeof source === "string" &&
        containsExternalFeature(
          source
        )
      ) {
        return res.status(400).json(
          buildExternalFeatureResponse(
            source
          )
        );
      }

      const result =
        await buildMultiEntityFlutterApp(
          source
        );

      if (
        result &&
        result.code
      ) {
        const code =
          sanitizeGeneratedFlutterCode(
            result.code
          );

        const structured =
          buildStructuredProject(
            code
          );

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            structured.entrypoint ||
            "lib/main.dart",

          source:
            "multi-entity-compiler",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "local",

          meta:
            result.meta ||
            {},
        });
      }

      return res.status(400).json({
        success:
          false,

        unsupported:
          true,

        message:
          CRUD_SCOPE_MESSAGE,

        suggestions:
          SUPPORTED_EXAMPLES,
      });

    } catch (error) {
      console.error(
        "Multi-entity generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Multi-entity generation failed.",
      });
    }
  }
);


/* ============================================================
   EXISTING CONTEXT-AWARE PLANNING ROUTE
   ============================================================ */

router.post(
  "/context-plan",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        context,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      const result =
        await getContextAwarePlan(
          finalPrompt,
          context || {}
        );

      return res.json({
        success:
          true,

        plan:
          result,
      });

    } catch (error) {
      console.error(
        "Context-aware planning error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Context-aware planning failed.",
      });
    }
  }
);


/* ============================================================
   EXISTING CONTEXT-AWARE GENERATION ROUTE
   ============================================================ */

router.post(
  "/context-generate",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        context,
      } = req.body || {};

      const finalPrompt =
        cleanPrompt(prompt);

      if (
        isEmptyPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      if (
        isTooBigPrompt(
          finalPrompt
        )
      ) {
        return res.status(400).json(
          buildTooComplexResponse(
            finalPrompt
          )
        );
      }

      const plan =
        await getContextAwarePlan(
          finalPrompt,
          context || {}
        );

      const result =
        await buildContextAwareFlutterApp(
          plan
        );

      if (
        result &&
        result.code
      ) {
        const code =
          sanitizeGeneratedFlutterCode(
            result.code
          );

        const structured =
          buildStructuredProject(
            code
          );

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            structured.entrypoint ||
            "lib/main.dart",

          source:
            "context-aware-generator",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "local",

          meta: {
            ...(result.meta || {}),
            plan,
          },
        });
      }

      return res.status(400).json({
        success:
          false,

        unsupported:
          true,

        message:
          CRUD_SCOPE_MESSAGE,

        suggestions:
          SUPPORTED_EXAMPLES,
      });

    } catch (error) {
      console.error(
        "Context-aware generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Context-aware generation failed.",
      });
    }
  }
);


/* ============================================================
   EXISTING ARCHITECT BLUEPRINT ROUTE
   ============================================================ */

router.post(
  "/architect",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        spec,
      } = req.body || {};

      const source =
        spec ||
        prompt;

      if (!source) {
        return res.status(400).json({
          success:
            false,

          message:
            "Prompt or specification is required.",
        });
      }

      const blueprint =
        await buildArchitectBlueprint(
          source
        );

      return res.json({
        success:
          true,

        blueprint,
      });

    } catch (error) {
      console.error(
        "Architect blueprint error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Architect blueprint generation failed.",
      });
    }
  }
);


/* ============================================================
   EXISTING WORKSPACE COMPONENT SPEC ROUTE
   ============================================================ */

router.post(
  "/workspace-component-spec",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        spec,
        context,
      } = req.body || {};

      const source =
        spec ||
        prompt;

      if (!source) {
        return res.status(400).json({
          success:
            false,

          message:
            "Prompt or specification is required.",
        });
      }

      const result =
        await buildWorkspaceComponentSpec(
          source,
          context || {}
        );

      return res.json({
        success:
          true,

        componentSpec:
          result,
      });

    } catch (error) {
      console.error(
        "Workspace component specification error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "Workspace component specification failed.",
      });
    }
  }
);


/* ============================================================
   EXISTING CRUD GENERATOR ROUTE
   ============================================================ */

router.post(
  "/crud-generate",
  auth,
  generationLimiter,
  async (req, res) => {
    try {
      const {
        prompt,
        spec,
        uiPreset,
      } = req.body || {};

      const source =
        spec ||
        prompt;

      if (!source) {
        return res.status(400).json({
          success:
            false,

          message:
            EMPTY_PROMPT_MESSAGE,
        });
      }

      if (
        typeof source === "string" &&
        isTooBigPrompt(
          source
        )
      ) {
        return res.status(400).json(
          buildTooComplexResponse(
            source
          )
        );
      }

      if (
        typeof source === "string" &&
        containsExternalFeature(
          source
        )
      ) {
        return res.status(400).json(
          buildExternalFeatureResponse(
            source
          )
        );
      }

      const result =
        buildFlutterCrudApp(
          source,
          {
            uiPreset:
              uiPreset ||
              inferUiPresetFromPrompt(
                typeof source === "string"
                  ? source
                  : ""
              ),
          }
        );

      if (
        result &&
        result.code
      ) {
        const code =
          sanitizeGeneratedFlutterCode(
            result.code
          );

        const structured =
          buildStructuredProject(
            code
          );

        return res.json({
          success:
            true,

          code,

          generatedCode:
            code,

          projectFiles:
            structured.files,

          fileManifest:
            filesToManifest(
              structured.files
            ),

          entrypoint:
            structured.entrypoint ||
            "lib/main.dart",

          source:
            "crud-factory",

          unsupported:
            false,

          shouldFallback:
            false,

          storageMode:
            "local",

          meta:
            result.meta ||
            {},
        });
      }

      return res.status(400).json({
        success:
          false,

        unsupported:
          true,

        message:
          CRUD_SCOPE_MESSAGE,

        suggestions:
          SUPPORTED_EXAMPLES,
      });

    } catch (error) {
      console.error(
        "CRUD generation error:",
        error
      );

      return res.status(500).json({
        success:
          false,

        message:
          error.message ||
          "CRUD generation failed.",
      });
    }
  }
);


/* ============================================================
   HEALTH / ROUTE INFO
   ============================================================ */

router.get(
  "/health",
  (req, res) => {
    return res.json({
      success:
        true,

      service:
        "template-generation",

      status:
        "ok",

      routes: {
        hybridGenerate:
          "/hybrid-generate",

        template:
          "/template",

        supabaseGenerate:
          "/supabase-generate",

        aiGenerate:
          "/ai-generate",

        crudGenerate:
          "/crud-generate",

        findTemplate:
          "/find-template",

        analyze:
          "/analyze",

        plan:
          "/plan",

        uiPreset:
          "/ui-preset",

        multiEntityGenerate:
          "/multi-entity-generate",

        contextPlan:
          "/context-plan",

        contextGenerate:
          "/context-generate",

        architect:
          "/architect",

        workspaceComponentSpec:
          "/workspace-component-spec",
      },

      claudeRouting:
        true,

      groqRouting:
        true,

      directMultiFileGeneration:
        true,
    });
  }
);


/* ============================================================
   MODULE EXPORT
   ============================================================ */

module.exports =
  router;