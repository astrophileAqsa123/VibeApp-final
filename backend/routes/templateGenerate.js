const express = require("express");
const {
  generateExact500CrudTemplate,
  findBestTemplate,
} = require("../services/exact500AppTemplates");

const { sanitizeGeneratedFlutterCode } = require('../services/exact500AppTemplates/flutterCodeSafety');
const { generateFlutterCode } = require("../services/aiService");
const { buildFlutterCrudApp } = require("../services/exact500AppTemplates/uniqueFlutterCrudFactory");
const { buildFlutterSupabaseCrudApp } = require("../services/exact500AppTemplates/supabaseCrudFactory");
const { analyzeAppPrompt } = require("../services/aiTemplateRouter");
const { normalizeAppSpec } = require("../services/appSpec");
const { planApplication } = require("../services/ai/componentPlanner");
const { buildMultiEntityFlutterApp } = require("../services/multiEntityFlutterCompiler");
const { normalizeUiPreset, inferUiPresetFromPrompt } = require("../services/uiPresets");
const { getContextAwarePlan } = require("../services/contextAwareAppPlanner");
const { buildContextAwareFlutterApp } = require("../services/contextAwareFlutterFactory");
const { buildArchitectBlueprint } = require("../services/ai/appArchitectAgent");
const { buildWorkspaceComponentSpec } = require("../services/ai/workspaceComponentSpec");
const auth = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

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
  "This app idea is too large to generate in one go. VibeApp generates single-screen Flutter CRUD apps. Break it into smaller pieces — for example, start with just the core record-management screen, then add features one at a time using the chat editor.";

// Signals that a prompt is asking for something too large for a single main.dart
const COMPLEXITY_SIGNALS = [
  // Multi-screen / multi-module indicators
  "multiple screens", "multiple pages", "many screens", "many pages",
  "full app", "complete app", "entire app", "whole app",
  "all features", "all modules", "all screens",
  "multi-module", "multimodule", "multi module",
  // Role-based systems
  "admin panel", "admin dashboard", "admin portal",
  "user roles", "role-based", "role based", "permissions system",
  "super admin", "multi user", "multiuser",
  // Structural complexity (ordinary product categories such as CRM,
  // e-commerce, POS, and booking are valid and can use in-memory services).
  "multi-vendor", "super admin",
  // Too many explicit screens listed
  "home screen", // if combined with several others it's a signal — counted below
];

// Count how many distinct "screen" or "page" words appear
function countScreenMentions(text) {
  const matches = text.match(/\b\w+\s+(screen|page|view|panel|dashboard|module)\b/gi);
  return matches ? matches.length : 0;
}

function isTooBigPrompt(prompt = "") {
  const text = prompt.toLowerCase();

  // Hard keyword match
  for (const signal of COMPLEXITY_SIGNALS) {
    if (text.includes(signal)) return true;
  }

  // More than 4 distinct screen/page/view mentions in one prompt
  if (countScreenMentions(text) >= 4) return true;

  // Prompt itself is excessively long (> 400 chars = someone describing a full system)
  if (prompt.length > 400) return true;

  return false;
}

function isMultiEntityPrompt(prompt = "") {
  const text = cleanPrompt(prompt).toLowerCase();
  if (!text) return false;
  if (/\bentities\s*:/.test(text)) return true;
  if (/\b(full\s+crud\s+for\s+(?:every|each|all)\s+entit|multiple\s+related\s+entities|multi[- ]entity)\b/.test(text)) return true;
  const relationshipIntent = /\b(many[- ]to[- ]many|one[- ]to[- ]many|belongs\s+to|relationship\s+management|referential\s+integrity|has\s+many|have\s+many|contains\s+many)\b/.test(text);
  const crudIntent = /\b(crud|create|edit|delete|manage|management)\b/.test(text);
  return relationshipIntent && crudIntent;
}

function cleanPrompt(prompt = "") {
  return String(prompt || "").replace(/\s+/g, " ").trim();
}

function isEmptyPrompt(prompt = "") {
  return !cleanPrompt(prompt);
}

function isExternalFeatureReason(reason = "") {
  const text = String(reason || "").toLowerCase();
  return (
    text.includes("unsupported integration") ||
    text.includes("external feature") ||
    text.includes("firebase") ||
    text.includes("supabase") ||
    text.includes("payment") ||
    text.includes("maps") ||
    text.includes("camera") ||
    text.includes("backend") ||
    text.includes("database")
  );
}

function buildUnsupportedResponse(prompt, result = {}, type = null) {
  const reason = result.reason || result.message || "Unsupported request.";
  const externalFeature = isExternalFeatureReason(reason);

  if (isEmptyPrompt(prompt)) {
    return {
      success: false,
      unsupported: true,
      shouldFallback: false,
      type: "empty_prompt",
      message: EMPTY_PROMPT_MESSAGE,
      reason,
      suggestions: SUPPORTED_EXAMPLES,
      meta: result.meta || {},
    };
  }

  if (type === "too_complex" || isTooBigPrompt(prompt)) {
    return {
      success: false,
      unsupported: true,
      shouldFallback: false,
      type: "too_complex",
      message: TOO_COMPLEX_MESSAGE,
      tip: "Start simple: describe one screen with a few fields. Use the chat editor after generation to add more.",
      suggestions: SUPPORTED_EXAMPLES,
      meta: result.meta || {},
    };
  }

  if (externalFeature) {
    return {
      success: false,
      unsupported: true,
      shouldFallback: false,
      type: "unsupported_external_feature",
      message: EXTERNAL_FEATURE_MESSAGE,
      reason,
      supportedScope:
        "Flutter CRUD apps with template matching, colors/themes, fields, layouts, title/logo changes, and common local UI screens.",
      suggestions: [
        "Create product inventory app with orders and customer records",
        "Create student management app with login screen and blue theme",
        "Create appointment booking CRUD app with date, phone and status fields",
        "Create notes app with title, content and category fields",
      ],
      meta: result.meta || {},
    };
  }

  return {
    success: false,
    unsupported: true,
    shouldFallback: false,
    type: "unsupported_app_concept",
    message: CRUD_SCOPE_MESSAGE,
    reason,
    supportedScope:
      "VibeApp currently supports Flutter CRUD / record-management apps such as students, inventory, notes, expenses, appointments, tasks, customers, bookings, staff, vendors, invoices, and similar apps.",
    suggestions: SUPPORTED_EXAMPLES,
    meta: result.meta || {},
  };
}

// V2 planning boundary: AI may describe the application with registered
// components, but it cannot return or mutate Flutter source code here.
router.post("/component-plan", auth, generationLimiter, async (req, res) => {
  try {
    const prompt = cleanPrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt is required." });
    }
    const plan = await planApplication(prompt);
    return res.status(plan.ready ? 200 : 422).json({
      success: plan.ready,
      ...plan,
    });
  } catch (error) {
    console.error("component-plan error:", error);
    return res.status(422).json({
      success: false,
      ready: false,
      message: error.message || "The application plan could not be validated.",
      validationErrors: error.validationErrors || [],
    });
  }
});

function applyAiPlanToTemplate(rawTemplate, aiPlan, originalPrompt = "") {
  if (!rawTemplate || !aiPlan) return rawTemplate;
  const template = JSON.parse(JSON.stringify(rawTemplate));

  // Explicit fields remain exact, while short prompts receive AI-inferred
  // domain fields instead of the generic Title/Description/Status fallback.
  if (Array.isArray(aiPlan.fields) && aiPlan.fields.length > 0) {
    template.fields = aiPlan.fields;
  }

  if (aiPlan.appName) {
    template.appName = aiPlan.appName;
  }
  if (aiPlan.entity) {
    template.entity = aiPlan.entity;
    template.emptyState = `No ${aiPlan.entity.toLowerCase()} records yet`;
    template.cta = `Add ${aiPlan.entity}`;
  }

  if (aiPlan.theme) {
    if (typeof aiPlan.theme === "object" && aiPlan.theme.primary && aiPlan.theme.background) {
      template.theme = {
        primary: aiPlan.theme.primary,
        secondary: aiPlan.theme.secondary || aiPlan.theme.primary,
        background: aiPlan.theme.background,
        surface: aiPlan.theme.surface || (aiPlan.theme.isLight ? "#FFFFFF" : "#0F172A"),
        text: aiPlan.theme.text || (aiPlan.theme.isLight ? "#1C1917" : "#FFFFFF"),
        accent: aiPlan.theme.accent || aiPlan.theme.primary,
      };
    } else if (typeof aiPlan.theme === "string") {
      const THEMES = {
        blue: { primary: "#2563EB", secondary: "#38BDF8", background: "#EFF6FF", surface: "#FFFFFF", text: "#0F172A", accent: "#60A5FA" },
        emerald: { primary: "#059669", secondary: "#10B981", background: "#022C22", surface: "#064E3B", text: "#ECFDF5", accent: "#34D399" },
        green: { primary: "#10B981", secondary: "#34D399", background: "#022C22", surface: "#064E3B", text: "#FFFFFF", accent: "#6EE7B7" },
        orange: { primary: "#F97316", secondary: "#FB923C", background: "#1C0700", surface: "#431407", text: "#FFFFFF", accent: "#FDBA74" },
        sunset: { primary: "#F97316", secondary: "#EC4899", background: "#1C0700", surface: "#431407", text: "#FFFFFF", accent: "#FDBA74" },
        dark: { primary: "#38BDF8", secondary: "#A855F7", background: "#020617", surface: "#0F172A", text: "#FFFFFF", accent: "#22D3EE" },
        purple: { primary: "#8B5CF6", secondary: "#C084FC", background: "#0F0728", surface: "#1E1045", text: "#FFFFFF", accent: "#A78BFA" },
        cyan: { primary: "#06B6D4", secondary: "#22D3EE", background: "#083344", surface: "#155E75", text: "#FFFFFF", accent: "#67E8F9" },
        red: { primary: "#EF4444", secondary: "#F97316", background: "#1F0505", surface: "#2A0C0C", text: "#FFFFFF", accent: "#FCA5A5" },
        beige: { primary: "#D2B48C", secondary: "#A67C52", background: "#F5F5DC", surface: "#FFFFFF", text: "#292524", accent: "#C19A6B" },
        white: { primary: "#111827", secondary: "#2563EB", background: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", accent: "#2563EB" },
      };
      const tKey = Object.keys(THEMES).find((k) => aiPlan.theme.toLowerCase().includes(k));
      if (tKey) {
        template.theme = THEMES[tKey];
      } else if (/^#[0-9a-fA-F]{6}$/.test(aiPlan.theme)) {
        template.theme = {
          primary: aiPlan.theme,
          secondary: "#22D3EE",
          background: "#020617",
          surface: "#0F172A",
          text: "#FFFFFF",
          accent: aiPlan.theme,
        };
      }
    }
  }

  template.uiPreset = normalizeUiPreset(aiPlan.uiPreset || inferUiPresetFromPrompt(originalPrompt, template.uiPreset || "modern"));

  if (aiPlan.layout) {
    if (aiPlan.layout.includes("grid")) {
      template.layout = "catalog_grid";
      template.uiVariant = 21;
    } else if (aiPlan.layout.includes("table")) {
      template.layout = "ledger_table";
      template.uiVariant = 31;
    } else if (aiPlan.layout.includes("timeline")) {
      template.layout = "timeline_rail";
      template.uiVariant = 41;
    } else if (aiPlan.layout.includes("board") || aiPlan.layout.includes("kanban")) {
      template.layout = "kanban_board";
      template.uiVariant = 51;
    } else if (aiPlan.layout.includes("list")) {
      template.layout = "card_stack";
      template.uiVariant = 11;
    }
  }

  const promptRequestsAuth = /\b(login|log in|sign in|signin|authentication|auth|role[- ]based|permissions?)\b/i.test(originalPrompt);
  if (aiPlan.auth?.enabled || promptRequestsAuth) {
    template.features = {
      ...(template.features || {}),
      hasAuth: true,
      allowSignup: aiPlan.auth?.allowSignup !== false || /\b(sign ?up|signup|register|create account)\b/i.test(originalPrompt),
      roles: Array.isArray(aiPlan.auth.roles) && aiPlan.auth.roles.length
        ? aiPlan.auth.roles
        : (() => {
            const inferred = buildArchitectBlueprint(originalPrompt).roles.map((role) => role.label);
            return inferred.length ? inferred : ["User", "Administrator"];
          })(),
    };
  }

  return normalizeAppSpec(template, { storageMode: template.storageMode || "local" }).spec;
}

router.post("/hybrid-generate", auth, generationLimiter, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const finalPrompt = cleanPrompt(prompt);

    // Empty prompt — reject immediately, no AI call needed
    if (isEmptyPrompt(finalPrompt)) {
      return res.status(200).json(buildUnsupportedResponse(finalPrompt, {}));
    }

    // Large prompts are intentionally allowed. They are routed through the AI
    // path and implemented as a production-style in-memory product when an
    // external backend or platform service is not available in preview.

    // Workspace requests still use the contextual architect for domain/role intent,
    // but rendering must go through the component library + AppSpec compiler first.
    // This preserves the rich reusable Material components, CRUD behaviour and
    // multi-colour product UI instead of replacing the app with a thin generic shell.
    const architectFirstPlan = getContextAwarePlan(finalPrompt);
    if (architectFirstPlan?.family === "workspace") {
      const architectRoleMode = architectFirstPlan.featurePolicies?.roleBased === true && Array.isArray(architectFirstPlan.roles) && architectFirstPlan.roles.length > 0;

      // Role-based management workspaces must use the architect-backed AppSpec as
      // the source of truth. A generic AI component plan can omit authentication,
      // roles, dashboard permissions, or role navigation even when the architect
      // correctly inferred them. That previously caused management apps to open
      // directly on CRUD lists instead of Splash -> Login -> Role -> Dashboard.
      if (!architectRoleMode) try {
        const componentPlan = await planApplication(finalPrompt);
        if (componentPlan?.ready && Array.isArray(componentPlan.spec?.entities) && componentPlan.spec.entities.length) {
          const compiled = buildMultiEntityFlutterApp(componentPlan.spec);
          const safeCode = sanitizeGeneratedFlutterCode(compiled.code);
          return res.json({
            success: true,
            code: safeCode,
            generatedCode: safeCode,
            source: "component-library-workspace",
            unsupported: false,
            shouldFallback: false,
            storageMode: componentPlan.spec?.app?.storageMode || "local",
            appConfig: componentPlan.spec,
            appSpec: componentPlan.spec,
            requirements: componentPlan.requirements || [],
            componentPlan: componentPlan.componentPlan || [],
            missingCapabilities: componentPlan.missingCapabilities || [],
            coverage: componentPlan.coverage || null,
            warnings: componentPlan.warnings || [],
            assumptions: componentPlan.assumptions || [],
            fileManifest: compiled.fileManifest,
            entrypoint: compiled.entrypoint,
            meta: {
              appName: componentPlan.spec?.app?.name || architectFirstPlan.appName,
              domain: architectFirstPlan.domain,
              roles: architectFirstPlan.roles.map((role) => role.label),
              componentLibrary: true,
              architectGuided: true,
              entityCount: componentPlan.spec.entities.length,
            },
          });
        }
        console.warn("Workspace AI component plan was incomplete; using deterministic component blueprint.");
      } catch (componentError) {
        console.warn("Workspace AI component planning failed; using deterministic component blueprint:", componentError.message);
      }

      // Deterministic component-library fallback. This still goes through AppSpec
      // and the reusable multi-entity compiler; it does NOT fall back to the thin
      // generic workspace UI merely because the planning model is unavailable.
      try {
        const deterministicSpec = buildWorkspaceComponentSpec(architectFirstPlan, finalPrompt);
        const compiled = buildMultiEntityFlutterApp(deterministicSpec);
        const safeCode = sanitizeGeneratedFlutterCode(compiled.code);
        return res.json({
          success: true,
          code: safeCode,
          generatedCode: safeCode,
          source: "component-library-workspace-deterministic",
          unsupported: false,
          shouldFallback: false,
          storageMode: deterministicSpec.app?.storageMode || "memory",
          appConfig: deterministicSpec,
          appSpec: deterministicSpec,
          componentPlan: deterministicSpec.selectedCapabilities || [],
          fileManifest: compiled.fileManifest,
          entrypoint: compiled.entrypoint,
          meta: {
            appName: deterministicSpec.app?.name || architectFirstPlan.appName,
            domain: architectFirstPlan.domain,
            roles: architectFirstPlan.roles.map((role) => role.label),
            componentLibrary: true,
            deterministicComponentFallback: true,
            entityCount: deterministicSpec.entities.length,
          },
        });
      } catch (deterministicError) {
        console.warn("Deterministic workspace component compilation failed; using final contextual fallback:", deterministicError.message);
      }

      // Final safety fallback only. Normal workspace generation stays on the component compiler.
      try {
        const contextual = buildContextAwareFlutterApp(architectFirstPlan);
        const safeCode = sanitizeGeneratedFlutterCode(contextual.code);
        return res.json({
          success: true, code: safeCode, generatedCode: safeCode,
          source: "contextual-workspace-fallback", unsupported: false, shouldFallback: false, storageMode: "local",
          appConfig: { ...architectFirstPlan, generationMode: "context-aware", contextual: true },
          appSpec: {
            specVersion: 2,
            app: { id: architectFirstPlan.archetype, name: architectFirstPlan.appName, description: finalPrompt, storageMode: "local" },
            archetype: architectFirstPlan.archetype, family: architectFirstPlan.family, domain: architectFirstPlan.domain,
            roles: architectFirstPlan.roles, roleDashboards: architectFirstPlan.roleDashboards,
            navigation: architectFirstPlan.appBlueprint?.navigation, primaryActions: architectFirstPlan.appBlueprint?.primaryActions,
            featurePolicies: architectFirstPlan.featurePolicies, screens: architectFirstPlan.appBlueprint?.screens || [],
          },
          meta: {
            appName: architectFirstPlan.appName, archetype: architectFirstPlan.archetype, family: architectFirstPlan.family, domain: architectFirstPlan.domain,
            roles: architectFirstPlan.roles.map((role) => role.label), screenCount: architectFirstPlan.screenBlueprint.length,
            featurePolicies: architectFirstPlan.featurePolicies, contextualComposition: true, fallbackOnly: true,
          },
        });
      } catch (architectError) {
        console.warn("Contextual workspace fallback failed; continuing to existing pipeline:", architectError.message);
      }
    }


    // Multi-entity requests use AppSpec V2 and a deterministic compiler. They
    // must never be silently collapsed to the legacy primary-entity renderer.
    if (isMultiEntityPrompt(finalPrompt)) {
      try {
        const plan = await planApplication(finalPrompt);
        if (!plan.ready || !Array.isArray(plan.spec?.entities) || plan.spec.entities.length < 2) {
          return res.status(422).json({
            success: false,
            unsupported: true,
            shouldFallback: false,
            type: "incomplete_multi_entity_plan",
            message: "The multi-entity plan was incomplete, so generation was stopped instead of returning a partial app.",
            requirements: plan.requirements || [],
            missingCapabilities: plan.missingCapabilities || [],
            coverage: plan.coverage || null,
          });
        }

        const compiled = buildMultiEntityFlutterApp(plan.spec);
        return res.json({
          success: true,
          source: "appspec-v2-multi-entity-compiler",
          code: compiled.code,
          generatedCode: compiled.code,
          unsupported: false,
          shouldFallback: false,
          storageMode: "local",
          appConfig: plan.spec,
          appSpec: plan.spec,
          requirements: plan.requirements,
          componentPlan: plan.componentPlan,
          missingCapabilities: plan.missingCapabilities,
          coverage: plan.coverage,
          warnings: plan.warnings || [],
          assumptions: plan.assumptions || [],
          fileManifest: compiled.fileManifest,
          entrypoint: compiled.entrypoint,
          meta: {
            appName: plan.spec.app.name,
            entityCount: plan.spec.entities.length,
            relationshipCount: plan.spec.relationships.length,
            compiler: "appspec-v2",
          },
        });
      } catch (planningError) {
        console.error("Multi-entity planning or compilation failed:", planningError.message);
        return res.status(422).json({
          success: false,
          unsupported: true,
          shouldFallback: false,
          type: "multi_entity_generation_failed",
          message: "The complete multi-entity application could not be validated. No partial single-entity app was generated.",
          reason: planningError.message,
        });
      }
    }

    // Context-aware product composition comes before the generic CRUD/custom-AI split.
    // It recognizes high-confidence app archetypes (trackers, calculators, finance,
    // timers, quiz, scheduling, catalog, converters) and generates domain-specific
    // functionality instead of forcing every request into the same CRUD shell.
    const contextualPlan = getContextAwarePlan(finalPrompt);
    if (contextualPlan) {
      try {
        const contextual = buildContextAwareFlutterApp(contextualPlan);
        const safeCode = sanitizeGeneratedFlutterCode(contextual.code);
        return res.json({
          success: true,
          code: safeCode,
          generatedCode: safeCode,
          source: "context-aware-component-composer",
          unsupported: false,
          shouldFallback: false,
          storageMode: "local",
          appConfig: {
            ...contextualPlan,
            generationMode: "context-aware",
            contextual: true,
          },
          appSpec: {
            specVersion: 2,
            app: {
              id: contextualPlan.archetype,
              name: contextualPlan.appName,
              description: finalPrompt,
              storageMode: "local",
            },
            archetype: contextualPlan.archetype,
            family: contextualPlan.family,
            uiPreset: contextualPlan.uiPreset,
            theme: contextualPlan.theme,
            capabilities: contextualPlan.capabilities,
          },
          meta: {
            appName: contextualPlan.appName,
            appType: contextualPlan.archetype,
            archetype: contextualPlan.archetype,
            family: contextualPlan.family,
            domain: contextualPlan.domain,
            uiPreset: contextualPlan.uiPreset,
            capabilities: contextualPlan.capabilities,
            confidence: contextualPlan.confidence,
            contextualComposition: true,
          },
        });
      } catch (contextError) {
        console.warn("Context-aware composition failed; continuing to legacy routes:", contextError.message);
      }
    }

    // 1. Try AI Intent Router to understand what user wants
    let aiPlan = null;
    try {
      aiPlan = await analyzeAppPrompt(finalPrompt);
    } catch (routerErr) {
      console.warn("aiTemplateRouter error, falling back to regex matcher:", routerErr.message);
    }

    // AI-assisted contextual fallback: when regex classification was not enough,
    // reuse the intent router's archetype/domain hint and still prefer controlled
    // functional composition over unrestricted whole-app AI generation.
    const aiContextualPlan = getContextAwarePlan(finalPrompt, aiPlan);
    if (aiContextualPlan) {
      try {
        const contextual = buildContextAwareFlutterApp(aiContextualPlan);
        const safeCode = sanitizeGeneratedFlutterCode(contextual.code);
        return res.json({
          success: true, code: safeCode, generatedCode: safeCode,
          source: "context-aware-component-composer",
          unsupported: false, shouldFallback: false, storageMode: "local",
          appConfig: { ...aiContextualPlan, generationMode: "context-aware", contextual: true },
          appSpec: {
            specVersion: 2,
            app: { id: aiContextualPlan.archetype, name: aiContextualPlan.appName, description: finalPrompt, storageMode: "local" },
            archetype: aiContextualPlan.archetype, family: aiContextualPlan.family,
            uiPreset: aiContextualPlan.uiPreset, theme: aiContextualPlan.theme, capabilities: aiContextualPlan.capabilities,
          },
          meta: {
            appName: aiContextualPlan.appName, appType: aiContextualPlan.archetype, archetype: aiContextualPlan.archetype,
            family: aiContextualPlan.family, domain: aiContextualPlan.domain, uiPreset: aiContextualPlan.uiPreset,
            capabilities: aiContextualPlan.capabilities, confidence: aiContextualPlan.confidence, contextualComposition: true, aiAssistedClassification: true,
          },
        });
      } catch (contextError) {
        console.warn("AI-assisted contextual composition failed; continuing to legacy routes:", contextError.message);
      }
    }

    // If AI explicitly determined this is NOT a CRUD app (e.g. calculator, stopwatch, game, tool)
    if (aiPlan && aiPlan.isCrud === false) {
      console.log(`Prompt identified as non-CRUD custom app, routing to AI code generation: "${finalPrompt}"`);
      try {
        const code = await generateFlutterCode(finalPrompt);
        const safeCode = sanitizeGeneratedFlutterCode(code);
        return res.json({
          success: true,
          code: safeCode,
          generatedCode: safeCode,
          source: "groq-ai-custom-app",
          unsupported: false,
          shouldFallback: false,
        });
      } catch (aiError) {
        console.error("Groq AI custom app generation failed:", aiError.message);
      }
    }

    // If AI identified it as a CRUD app with explicit fields or archetype
    if (aiPlan && aiPlan.isCrud === true) {
      const match =
        findBestTemplate(aiPlan.archetype || "") ||
        findBestTemplate(aiPlan.appName || "") ||
        findBestTemplate(finalPrompt);

      if (match?.matched && match?.template) {
        const assembledTemplate = applyAiPlanToTemplate(match.template, aiPlan, finalPrompt);
        const code = sanitizeGeneratedFlutterCode(buildFlutterCrudApp(assembledTemplate));
        return res.json({
          success: true,
          source: "ai-intent-template-assembly",
          code,
          generatedCode: code,
          unsupported: false,
          shouldFallback: false,
          appConfig: assembledTemplate,
          meta: {
            appType: assembledTemplate.appType,
            appName: assembledTemplate.appName,
            entity: assembledTemplate.entity,
            domain: assembledTemplate.domain,
            layout: assembledTemplate.layout,
            uiPreset: assembledTemplate.uiPreset,
            theme: assembledTemplate.theme,
            fields: assembledTemplate.fields,
            fieldCount: assembledTemplate.fields.length,
            templateMatched: true,
            appliedAiPlan: true,
            rawTemplate: assembledTemplate,
          },
        });
      }
    }

    // 2. Safe Fallback: Current deterministic template matcher
    const result = generateExact500CrudTemplate(finalPrompt);

    // Template matched — return it
    if (result.success) {
      if (result.code) {
        result.code = sanitizeGeneratedFlutterCode(result.code);
      }
      // Log which matching path was used so we can see how often synonyms/domain help
      const matchedVia = result.meta?.matchedVia || "exact";
      if (matchedVia !== "exact") {
        console.log(`Template matched via ${matchedVia} for prompt: "${finalPrompt}" → ${result.meta?.appName}`);
      }
      return res.json({
        ...result,
        unsupported: false,
        shouldFallback: false,
      });
    }

    // All template matching passes failed — including external-feature and
    // multi-module prompts — fall back to AI, which creates an in-memory
    // implementation for integrations unavailable in the preview runtime.
    console.log(`All template passes failed for prompt, trying Groq AI: "${finalPrompt}"`);
    try {
      const code = await generateFlutterCode(finalPrompt);
      const safeCode = sanitizeGeneratedFlutterCode(code);
      return res.json({
        success: true,
        code: safeCode,
        generatedCode: safeCode,
        source: "groq-ai-fallback",
        unsupported: false,
        shouldFallback: false,
      });
    } catch (aiError) {
      console.error("Groq AI fallback failed:", aiError.message);
      // AI also failed — now return the unsupported response
      return res.status(200).json(buildUnsupportedResponse(finalPrompt, result));
    }

  } catch (error) {
    console.error("hybrid-generate error:", error);

    return res.status(200).json({
      success: false,
      unsupported: true,
      shouldFallback: false,
      type: "generation_error",
      message:
        "VibeApp could not generate this app. Try a Flutter CRUD app prompt such as student management, inventory, notes, or appointments.",
      reason: error.message || "Generation failed",
      suggestions: SUPPORTED_EXAMPLES,
    });
  }
});

/* =====================================================
   Supabase CRUD generation — separate parallel path
   Reuses template matching, but outputs Supabase-connected code.
   Does NOT modify or affect the hybrid-generate endpoint above.
===================================================== */

router.post("/supabase-generate", auth, generationLimiter, async (req, res) => {
  try {
    const { prompt, supabaseUrl, supabaseAnonKey, tableName } = req.body || {};
    const finalPrompt = cleanPrompt(prompt);

    // Validate required Supabase fields
    if (!supabaseUrl || !String(supabaseUrl).trim()) {
      return res.status(400).json({
        success: false,
        message: "Supabase Project URL is required.",
      });
    }

    if (!supabaseAnonKey || !String(supabaseAnonKey).trim()) {
      return res.status(400).json({
        success: false,
        message: "Supabase Anon Key is required.",
      });
    }

    if (isEmptyPrompt(finalPrompt)) {
      return res.status(200).json(buildUnsupportedResponse(finalPrompt, {}));
    }

    if (isTooBigPrompt(finalPrompt)) {
      return res.status(200).json(buildUnsupportedResponse(finalPrompt, {}, "too_complex"));
    }

    // Sanitize database-specific words so template matcher does not trigger shouldFallback
    const sanitizedPrompt = finalPrompt
      .replace(/\b(supabase|firebase|database|postgres|mysql|sqlite|cloud sync|realtime|backend)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const promptToMatch = sanitizedPrompt.length >= 3 ? sanitizedPrompt : finalPrompt;

    // 1. Try AI Intent Router to extract user's exact fields and template archetype
    let aiPlan = null;
    try {
      aiPlan = await analyzeAppPrompt(finalPrompt);
    } catch (routerErr) {
      console.warn("aiTemplateRouter error in supabase-generate, falling back to regex matcher:", routerErr.message);
    }

    if (aiPlan && aiPlan.isCrud === true) {
      const match =
        findBestTemplate(aiPlan.archetype || "") ||
        findBestTemplate(aiPlan.appName || "") ||
        findBestTemplate(promptToMatch) ||
        findBestTemplate(finalPrompt) ||
        findBestTemplate("record");

      if (match?.matched && match?.template) {
        const assembledTemplate = applyAiPlanToTemplate(match.template, aiPlan, finalPrompt);
        const supabaseResult = buildFlutterSupabaseCrudApp({
          template: assembledTemplate,
          supabaseUrl: String(supabaseUrl).trim(),
          supabaseAnonKey: String(supabaseAnonKey).trim(),
          tableName: tableName ? String(tableName).trim() : (assembledTemplate.tableName || ""),
        });

        return res.json({
          success: true,
          code: supabaseResult.code,
          generatedCode: supabaseResult.code,
          tableSql: supabaseResult.tableSql,
          tableName: supabaseResult.tableName,
          source: "ai-intent-supabase-template",
          storageMode: "supabase",
          unsupported: false,
          shouldFallback: false,
          appConfig: assembledTemplate,
          meta: {
            appType: assembledTemplate.appType,
            appName: assembledTemplate.appName,
            entity: assembledTemplate.entity,
            domain: assembledTemplate.domain,
            layout: assembledTemplate.layout,
            uiPreset: assembledTemplate.uiPreset,
            theme: assembledTemplate.theme,
            fields: assembledTemplate.fields,
            fieldCount: assembledTemplate.fields.length,
            templateMatched: true,
            appliedAiPlan: true,
            rawTemplate: assembledTemplate,
          },
        });
      }
    }

    // 2. Safe Fallback: Use current deterministic template matcher
    let result = generateExact500CrudTemplate(promptToMatch);
    if (!result.success && promptToMatch !== finalPrompt) {
      result = generateExact500CrudTemplate(finalPrompt);
    }

    if (!result.success) {
      // Last-resort matching via findBestTemplate directly
      const fallbackMatch = findBestTemplate(promptToMatch) || findBestTemplate("record");
      if (fallbackMatch?.matched && fallbackMatch?.template) {
        result = {
          success: true,
          meta: { rawTemplate: fallbackMatch.template }
        };
      }
    }

    if (!result.success) {
      return res.status(200).json({
        success: false,
        unsupported: true,
        shouldFallback: false,
        type: "unsupported_app_concept",
        message:
          "Supabase generation requires a matching CRUD template. " +
          (result.reason || "Try a prompt like: student management, inventory, notes, expenses, appointments."),
        suggestions: SUPPORTED_EXAMPLES,
        meta: result.meta || {},
      });
    }

    // Build the Supabase-connected Flutter code using the matched template
    const supabaseResult = buildFlutterSupabaseCrudApp({
      template: result.meta?.rawTemplate || result.meta || {},
      supabaseUrl: String(supabaseUrl).trim(),
      supabaseAnonKey: String(supabaseAnonKey).trim(),
      tableName: tableName ? String(tableName).trim() : "",
    });

    return res.json({
      success: true,
      code: supabaseResult.code,
      generatedCode: supabaseResult.code,
      tableSql: supabaseResult.tableSql,
      tableName: supabaseResult.tableName,
      source: "supabase-template",
      storageMode: "supabase",
      unsupported: false,
      shouldFallback: false,
      meta: result.meta || {},
    });
  } catch (error) {
    console.error("supabase-generate error:", error);

    return res.status(500).json({
      success: false,
      message: "Supabase app generation failed: " + (error.message || "Unknown error"),
    });
  }
});

router.isTooBigPrompt = isTooBigPrompt;
router.isMultiEntityPrompt = isMultiEntityPrompt;
router.applyAiPlanToTemplate = applyAiPlanToTemplate;
module.exports = router;
