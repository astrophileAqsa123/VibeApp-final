const express = require("express");
const Project = require("../models/Project");
const { applyLocalCodeEdit, applyExtendedLocalPatch, isSupabaseCode, extractSupabaseConfigFromCode, reconstructAppConfigFromCode } = require("../services/localCodeEditService");
const { generateTableSql, deriveTableName } = require("../services/exact500AppTemplates/supabaseCrudFactory");
const { editFlutterCodeWithGroq } = require("../services/groqCodeEditService");
const { editFlutterCodeWithGroqDiff } = require("../services/groqDiffEditService");
const { sanitizeGeneratedFlutterCode, checkFlutterCodeSyntax } = require("../services/exact500AppTemplates/flutterCodeSafety");
const { attemptGroqSyntaxRepair } = require("../services/aiService");
const { buildProjectVersion, ensureCurrentVersionSnapshot } = require("../services/projectVersioning");
const { planApplication } = require("../services/ai/componentPlanner");
const { buildMultiEntityFlutterApp } = require("../services/multiEntityFlutterCompiler");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

const MAX_GROQ_CODE_CHARS = Number(process.env.MAX_GROQ_CODE_CHARS || 18000);

router.post("/:projectId/chat", auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message, instruction, baseVersion } = req.body;

    const finalInstruction = (message || instruction || "").trim();

    if (!finalInstruction) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      user: req.user?.id || req.user?.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // Older projects were saved without their initial version snapshot. Capture
    // the exact pre-edit code before choosing an edit base.
    ensureCurrentVersionSnapshot(project);
    const requestedBaseVersion = Number(baseVersion);
    const baseSnapshot = Number.isInteger(requestedBaseVersion) && requestedBaseVersion > 0
      ? (project.versions || []).find((item) => Number(item.version) === requestedBaseVersion)
      : null;
    if (baseVersion != null && !baseSnapshot) {
      return res.status(404).json({
        success: false,
        message: `Version ${baseVersion} was not found. Refresh the project and try again.`,
      });
    }

    const existingCode =
      baseSnapshot?.generatedCode ||
      project.currentCode ||
      project.generatedCode ||
      project.code ||
      project.generated_code ||
      "";

    if (!existingCode) {
      return res.status(400).json({
        success: false,
        message: "Project has no generated code to edit.",
      });
    }

    const originalPrompt = baseSnapshot?.prompt || project.prompt || project.latestPrompt || "";

    const supabaseConfig = {
      storageMode: baseSnapshot?.storageMode || project.storageMode || "local",
      supabaseUrl: project.supabaseUrl || "",
      supabaseAnonKey: project.supabaseAnonKey || "",
      supabaseTable: baseSnapshot?.supabaseTable || project.supabaseTable || "",
    };
    let nextStorageMode = supabaseConfig.storageMode;
    let nextTableSql = baseSnapshot ? (baseSnapshot.tableSql || "") : (project.tableSql || "");
    let nextSupabaseTable = supabaseConfig.supabaseTable;
    let nextAppConfig = baseSnapshot?.appConfig || project.appConfig || null;
    let nextAppSpec = baseSnapshot?.appSpec || project.appSpec || null;
    let nextRequirements = baseSnapshot?.requirements || project.requirements || [];
    let nextComponentPlan = baseSnapshot?.componentPlan || project.componentPlan || [];
    let nextFileManifest = baseSnapshot?.fileManifest || project.fileManifest || [];
    let nextEntrypoint = baseSnapshot?.entrypoint || project.entrypoint || "lib/main.dart";

    // 1. Try local edit first (theme, layout, fields, etc.) — no AI call needed
    let updatedCode = null;
    let editSource = "local-template-edit";

    const isMultiEntityProject = Array.isArray(nextAppSpec?.entities) && nextAppSpec.entities.length > 1;

    if (isMultiEntityProject) {
      let plan;
      try {
        plan = await planApplication(finalInstruction, { currentSpec: nextAppSpec });
      } catch (error) {
        return res.status(422).json({
          success: false,
          message: "The multi-entity edit could not be converted into a complete validated application plan. The current version was kept unchanged.",
          reason: error.message,
        });
      }
      if (!plan.ready || !Array.isArray(plan.spec?.entities) || plan.spec.entities.length < 2) {
        return res.status(422).json({
          success: false,
          message: "The edit would have removed required entities or relationships, so the current version was kept unchanged.",
          coverage: plan.coverage || null,
          missingCapabilities: plan.missingCapabilities || [],
        });
      }
      const compiled = buildMultiEntityFlutterApp(plan.spec);
      updatedCode = compiled.code;
      editSource = "appspec-v2-multi-entity-edit";
      nextAppSpec = plan.spec;
      nextAppConfig = plan.spec;
      nextRequirements = plan.requirements;
      nextComponentPlan = plan.componentPlan;
      nextFileManifest = compiled.fileManifest;
      nextEntrypoint = compiled.entrypoint;
    } else {
    const localResult = await applyLocalCodeEdit({
      instruction: finalInstruction,
      existingCode,
      originalPrompt,
      supabaseConfig,
      storageMode: nextStorageMode,
      appConfig: nextAppConfig,
    });

    if (localResult.handled) {
      if (localResult.alreadyApplied) {
        const noticeMessage = localResult.message || "This change is already applied to your app.";

        project.messages = project.messages || [];
        project.messages.push({
          role: "user",
          content: finalInstruction,
          createdAt: new Date(),
        });
        project.messages.push({
          role: "assistant",
          content: noticeMessage,
          source: "already-applied",
          generatedCode: existingCode,
          createdAt: new Date(),
        });

        await project.save();

        return res.json({
          success: true,
          alreadyApplied: true,
          message: noticeMessage,
          project,
          updatedCode: existingCode,
          generatedCode: existingCode,
          code: existingCode,
          source: "already-applied",
          storageMode: project.storageMode,
          tableSql: project.tableSql,
          tableName: project.supabaseTable,
        });
      }

      updatedCode = localResult.code;
      editSource = localResult.source || "local-template-edit";
      if (localResult.appConfig) {
        nextAppConfig = localResult.appConfig;
      }
      if (localResult.storageMode === "supabase") {
        nextStorageMode = "supabase";
      }
      if (localResult.tableSql) {
        nextTableSql = localResult.tableSql;
      }
      if (localResult.tableName) {
        nextSupabaseTable = localResult.tableName;
      }
    } else {
      // 2. Extended local patches (button color, font size, elevation, etc.) — no AI needed
      const extendedResult = applyExtendedLocalPatch({
        instruction: finalInstruction,
        existingCode,
      });

      if (extendedResult.handled) {
        updatedCode = extendedResult.code;
        editSource = extendedResult.source || "local-extended-patch";
      } else {
        // 3. Neither local path handled it — try diff-mode Groq (works on any size file)
        try {
          const diffResult = await editFlutterCodeWithGroqDiff({
            instruction: finalInstruction,
            existingCode,
            originalPrompt,
          });
          updatedCode = diffResult.updatedCode;
          editSource = "groq-diff-edit";
        } catch (diffError) {
          console.warn("Diff-mode edit failed, trying full-rewrite:", diffError.message);

          // 4. Fallback: full-rewrite Groq (only if code is small enough)
          if (existingCode.length > MAX_GROQ_CODE_CHARS) {
            return res.status(413).json({
              success: false,
              message:
                "This change could not be applied automatically. Try a more specific instruction, or use a supported local edit: theme, field, layout, border radius, font size, button style, or card elevation.",
            });
          }

          const result = await editFlutterCodeWithGroq({
            instruction: finalInstruction,
            existingCode,
            originalPrompt,
          });
          updatedCode = result.updatedCode;
          editSource = "groq-api-edit";
        }
      }
    }
    }

    // 3. Always sanitize the result before saving
    updatedCode = sanitizeGeneratedFlutterCode(updatedCode);
    let syntaxCheck = checkFlutterCodeSyntax(updatedCode);
    if (!syntaxCheck.valid) {
      const repaired = await attemptGroqSyntaxRepair(updatedCode, syntaxCheck.errors);
      if (repaired) {
        const repairedCheck = checkFlutterCodeSyntax(repaired);
        if (repairedCheck.valid) {
          updatedCode = repaired;
          syntaxCheck = repairedCheck;
          editSource = `${editSource}-repaired`;
        }
      }
    }
    if (!syntaxCheck.valid) {
      return res.status(422).json({
        success: false,
        message: "The requested edit produced invalid Flutter code, so the current version was kept unchanged. Try describing the change in a smaller, more specific step.",
        validationErrors: syntaxCheck.errors,
      });
    }

    // A historical version can be edited directly. Its code and metadata become
    // the base of the new latest version without rewriting old history.
    project.storageMode = nextStorageMode;
    project.tableSql = nextTableSql;
    project.supabaseTable = nextSupabaseTable;
    project.appConfig = nextAppConfig;
    project.appSpec = nextAppSpec;
    project.requirements = nextRequirements;
    project.componentPlan = nextComponentPlan;
    project.fileManifest = nextFileManifest;
    project.entrypoint = nextEntrypoint;

    // Keep Supabase tableSql synchronized with any modified or newly added fields
    const isSupabase = project.storageMode === "supabase" || isSupabaseCode(updatedCode);
    if (isSupabase) {
      project.storageMode = "supabase";
      const config = reconstructAppConfigFromCode(updatedCode, finalInstruction) || {};
      const extracted = extractSupabaseConfigFromCode(updatedCode);
      const tableName =
        project.supabaseTable ||
        extracted.tableName ||
        config.tableName ||
        deriveTableName({ entity: config.entity || project.title });
      const fields = config.fields && config.fields.length > 0 ? config.fields : [];
      project.tableSql = generateTableSql(tableName, fields);
      if (!project.supabaseTable) {
        project.supabaseTable = tableName;
      }
      if (!project.supabaseUrl && extracted.supabaseUrl) {
        project.supabaseUrl = extracted.supabaseUrl;
      }
    }

    // 4. Persist
    project.generatedCode = updatedCode;
    project.currentCode = updatedCode;
    project.latestPrompt = finalInstruction;
    project.generationSource = editSource;
    project.status = "updated";
    const highestCapturedVersion = (project.versions || []).reduce(
      (highest, item) => Math.max(highest, Number(item?.version || 0)),
      0
    );
    project.version = Math.max(Number(project.version || 1), highestCapturedVersion) + 1;

    const assistantContent = isSupabase
      ? "Changes applied to the existing generated app. Updated Supabase SQL table schema is ready to paste into your Supabase SQL Editor."
      : "Changes applied to the existing generated app.";

    project.messages = project.messages || [];
    project.messages.push({
      role: "user",
      content: finalInstruction,
      createdAt: new Date(),
    });
    project.messages.push({
      role: "assistant",
      content: assistantContent,
      source: editSource,
      generatedCode: updatedCode,
      createdAt: new Date(),
    });

    project.versions = project.versions || [];
    project.versions.push(buildProjectVersion({
      version: project.version,
      prompt: finalInstruction,
      source: editSource,
      generatedCode: updatedCode,
      storageMode: project.storageMode,
      tableSql: project.tableSql,
      supabaseTable: project.supabaseTable,
      appConfig: project.appConfig,
      appSpec: project.appSpec,
      requirements: project.requirements,
      componentPlan: project.componentPlan,
      fileManifest: project.fileManifest,
      entrypoint: project.entrypoint,
      createdAt: new Date(),
    }));

    await project.save();

    return res.json({
      success: true,
      message: "Project updated successfully.",
      project,
      updatedCode,
      generatedCode: updatedCode,
      code: updatedCode,
      source: editSource,
      storageMode: project.storageMode,
      tableSql: project.tableSql,
      tableName: project.supabaseTable,
    });
  } catch (error) {
    console.error("Project chat edit error:", error);

    if (error?.name === "VersionError") {
      return res.status(409).json({
        success: false,
        message: "This project changed while your edit was being applied. Refresh the project and submit the edit again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update project.",
    });
  }
});

module.exports = router;
