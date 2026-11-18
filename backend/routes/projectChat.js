const express = require("express");
const Project = require("../models/Project");

const {
  isSupabaseCode,
  extractSupabaseConfigFromCode,
  reconstructAppConfigFromCode,
} = require("../services/localCodeEditService");

const {
  generateTableSql,
  deriveTableName,
} = require("../services/exact500AppTemplates/supabaseCrudFactory");

const {
  editFlutterCodeWithClaude,
} = require("../services/claudeCodeService");

const {
  sanitizeGeneratedFlutterCode,
  checkFlutterCodeSyntax,
} = require("../services/exact500AppTemplates/flutterCodeSafety");

const {
  buildProjectVersion,
  ensureCurrentVersionSnapshot,
} = require("../services/projectVersioning");

const {
  buildStructuredProject,
  editStructuredProjectWithClaude,
  filesToManifest,
  normalizeProjectFiles,
} = require("../services/flutterProjectStructure");

const auth = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ============================================================
 * PROJECT CHAT / EXISTING APP EDITOR
 * ============================================================
 *
 * Initial generation:
 *
 *   Simple management prompt
 *        -> Component Library
 *
 *   Custom / utility prompt
 *        -> Groq -> Claude/Sonnet
 *
 * Existing app changes:
 *
 *   ALWAYS -> Claude/Sonnet
 *
 * Claude receives:
 *
 *   1. Original application prompt
 *   2. Current generated project/code
 *   3. User's requested modification
 *
 * Claude then returns the updated project/code.
 *
 * Component Library is NOT used for existing-project changes.
 * Groq is NOT used as a change editor.
 * ============================================================
 */

router.post("/:projectId/chat", auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const {
      message,
      instruction,
      baseVersion,
    } = req.body;

    /*
     * ============================================================
     * NORMALIZE USER INSTRUCTION
     * ============================================================
     */

    const finalInstruction =
      String(
        message ||
          instruction ||
          ""
      ).trim();

    if (!finalInstruction) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    /*
     * ============================================================
     * LOAD PROJECT
     * ============================================================
     */

    const project =
      await Project.findOne({
        _id: projectId,
        user:
          req.user?.id ||
          req.user?.userId,
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    /*
     * ============================================================
     * ENSURE CURRENT VERSION SNAPSHOT
     * ============================================================
     */

    ensureCurrentVersionSnapshot(
      project
    );

    /*
     * ============================================================
     * SELECT BASE VERSION
     * ============================================================
     *
     * If frontend provides baseVersion, edit that exact version.
     *
     * Otherwise edit current/latest project state.
     */

    const requestedBaseVersion =
      Number(baseVersion);

    const baseSnapshot =
      Number.isInteger(
        requestedBaseVersion
      ) &&
      requestedBaseVersion > 0
        ? (
            project.versions ||
            []
          ).find(
            (item) =>
              Number(
                item?.version
              ) ===
              requestedBaseVersion
          )
        : null;

    if (
      baseVersion != null &&
      !baseSnapshot
    ) {
      return res.status(404).json({
        success: false,

        message:
          `Version ${baseVersion} was not found. Refresh the project and try again.`,
      });
    }

    /*
     * ============================================================
     * GET EXISTING GENERATED CODE
     * ============================================================
     *
     * This is the source code that Claude will modify.
     *
     * Priority:
     *
     *   selected version
     *   -> currentCode
     *   -> generatedCode
     *   -> code
     *   -> generated_code
     */

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

        message:
          "Project has no generated Flutter code to edit.",
      });
    }

    /*
     * ============================================================
     * ORIGINAL APPLICATION PROMPT
     * ============================================================
     *
     * Claude needs this to understand the original purpose of
     * the application before applying the new change.
     */

    const originalPrompt =
      baseSnapshot?.prompt ||
      project.prompt ||
      project.latestPrompt ||
      "";

    /*
     * ============================================================
     * EXISTING PROJECT METADATA
     * ============================================================
     */

    const supabaseConfig = {
      storageMode:
        baseSnapshot?.storageMode ||
        project.storageMode ||
        "local",

      supabaseUrl:
        project.supabaseUrl ||
        "",

      supabaseAnonKey:
        project.supabaseAnonKey ||
        "",

      supabaseTable:
        baseSnapshot?.supabaseTable ||
        project.supabaseTable ||
        "",
    };

    /*
     * ============================================================
     * COPY CURRENT METADATA
     * ============================================================
     */

    let nextStorageMode =
      supabaseConfig.storageMode;

    let nextTableSql =
      baseSnapshot
        ? (
            baseSnapshot.tableSql ||
            ""
          )
        : (
            project.tableSql ||
            ""
          );

    let nextSupabaseTable =
      supabaseConfig.supabaseTable;

    let nextAppConfig =
      baseSnapshot?.appConfig ||
      project.appConfig ||
      null;

    let nextAppSpec =
      baseSnapshot?.appSpec ||
      project.appSpec ||
      null;

    let nextRequirements =
      baseSnapshot?.requirements ||
      project.requirements ||
      [];

    let nextComponentPlan =
      baseSnapshot?.componentPlan ||
      project.componentPlan ||
      [];

    let nextFileManifest =
      baseSnapshot?.fileManifest ||
      project.fileManifest ||
      [];

    let nextProjectFiles =
      baseSnapshot?.projectFiles ||
      project.projectFiles ||
      [];

    let nextEntrypoint =
      baseSnapshot?.entrypoint ||
      project.entrypoint ||
      "lib/main.dart";

    /*
     * ============================================================
     * CLAUDE / SONNET EDITING
     * ============================================================
     *
     * IMPORTANT:
     *
     * Existing project changes NEVER go through:
     *
     *   - Component Library
     *   - Groq
     *   - local patch editor
     *
     * They go directly to Claude/Sonnet.
     */

    let updatedCode = null;

    let structuredEditAlreadyDone =
      false;

    let editSource =
      "claude-sonnet-project-chat-edit";

    console.log(
      "================================================"
    );

    console.log(
      "PROJECT CHANGE -> CLAUDE/SONNET"
    );

    console.log(
      `Project ID: ${projectId}`
    );

    console.log(
      `Edit instruction: "${finalInstruction}"`
    );

    console.log(
      `Existing Flutter code length: ${existingCode.length} characters`
    );

    console.log(
      "Preparing current project context for Claude..."
    );

    console.log(
      "================================================"
    );

    try {
      /*
       * ==========================================================
       * LOAD STORED PROJECT FILES
       * ==========================================================
       *
       * If a multi-file project already exists, preserve all files.
       *
       * If projectFiles is missing/empty, construct a compatible
       * one-file project from the currently stored main.dart.
       *
       * This prevents normalizeProjectFiles([]) from destroying
       * the edit context.
       */

      const storedProjectFiles =
        baseSnapshot?.projectFiles ||
        project.projectFiles ||
        [];

      /*
       * A stored/legacy main.dart can exceed MAX_GENERATED_FILE_CHARS
       * (e.g. 105k chars). normalizeProjectFiles() rejects such a file,
       * which made every edit fail before Claude was even called.
       * In that case split it with the same structured builder used
       * for Component Library projects.
       */
      let existingProjectFiles;

      try {
        existingProjectFiles =
          Array.isArray(storedProjectFiles) &&
          storedProjectFiles.length > 0
            ? normalizeProjectFiles(storedProjectFiles)
            : normalizeProjectFiles([
                {
                  path: "lib/main.dart",
                  content: existingCode,
                  language: "dart",
                  role: "entrypoint",
                },
              ]);
      } catch (loadError) {
        console.warn(
          `Stored project files could not be normalized (${loadError.message}). Rebuilding structured project from main.dart...`
        );

        const mainFromStore =
          (Array.isArray(storedProjectFiles)
            ? storedProjectFiles.find(
                (f) => f && f.path === "lib/main.dart"
              )?.content
            : null) || existingCode;

        existingProjectFiles =
          normalizeProjectFiles(
            buildStructuredProject(mainFromStore).files
          );
      }

      /*
       * ==========================================================
       * MULTI-FILE PROJECT
       * ==========================================================
       *
       * If the existing project contains more than one file,
       * Claude must receive and modify the complete structured
       * project rather than collapsing everything into main.dart.
       */

      if (
        existingProjectFiles.length > 1
      ) {
        const structuredResult =
          await editStructuredProjectWithClaude({
            prompt:
              finalInstruction,

            files:
              existingProjectFiles,

            appSpec:
              nextAppSpec,

            originalPrompt:
              originalPrompt,

            supabaseConfig:
              supabaseConfig.storageMode ===
              "supabase"
                ? {
                    supabaseUrl:
                      supabaseConfig.supabaseUrl,

                    supabaseAnonKey:
                      supabaseConfig.supabaseAnonKey,
                  }
                : null,
          });

        if (
          !structuredResult ||
          !Array.isArray(
            structuredResult.files
          ) ||
          structuredResult.files.length === 0
        ) {
          throw new Error(
            "Claude/Sonnet returned an invalid structured Flutter project."
          );
        }

        nextProjectFiles =
          normalizeProjectFiles(
            structuredResult.files
          );

        nextFileManifest =
          filesToManifest(
            nextProjectFiles
          );

        structuredEditAlreadyDone =
          true;

        updatedCode =
          nextProjectFiles.find(
            (file) =>
              file.path ===
              "lib/main.dart"
          )?.content ||
          existingCode;

        editSource =
          structuredResult.source ||
          "claude-sonnet-project-chat-edit";

        console.log(
          `Claude/Sonnet updated structured Flutter project (${nextProjectFiles.length} files).`
        );
      }

      /*
       * ==========================================================
       * SINGLE-FILE PROJECT
       * ==========================================================
       *
       * Older/simple generated projects may contain only main.dart.
       *
       * Those projects continue through the single-file Claude editor.
       */

      else {
        const claudeResult =
          await editFlutterCodeWithClaude({
            prompt:
              finalInstruction,

            currentCode:
              existingCode,

            appSpec:
              nextAppSpec,

            originalPrompt:
              originalPrompt,

            supabaseConfig:
              supabaseConfig.storageMode ===
              "supabase"
                ? {
                    supabaseUrl:
                      supabaseConfig.supabaseUrl,

                    supabaseAnonKey:
                      supabaseConfig.supabaseAnonKey,
                  }
                : null,
          });

        // editFlutterCodeWithClaude() returns { code, generatedCode, ... }
        updatedCode =
          typeof claudeResult === "string"
            ? claudeResult
            : claudeResult?.code ||
              claudeResult?.generatedCode ||
              null;

        console.log(
          "Claude/Sonnet returned updated Flutter code."
        );
      }

      if (
        !updatedCode ||
        typeof updatedCode !== "string"
      ) {
        throw new Error(
          "Claude/Sonnet returned empty Flutter code."
        );
      }

      console.log(
        `Updated Flutter code length: ${updatedCode.length} characters`
      );

    } catch (claudeError) {
      console.error(
        "================================================"
      );

      console.error(
        "CLAUDE/SONNET PROJECT EDIT FAILED"
      );

      console.error(
        claudeError
      );

      console.error(
        "================================================"
      );

      return res.status(500).json({
        success: false,

        message:
          claudeError?.message ||
          "Claude/Sonnet could not apply the requested change.",

        source:
          "claude-sonnet-project-chat-edit",
      });
    }

    /*
     * ============================================================
     * SANITIZE UPDATED MAIN.DART
     * ============================================================
     *
     * Only sanitize main.dart content here.
     *
     * For structured projects, the remaining files were already
     * returned by Claude and are preserved separately.
     */

    updatedCode =
      sanitizeGeneratedFlutterCode(
        updatedCode
      );

    /*
     * ============================================================
     * VALIDATE UPDATED MAIN.DART
     * ============================================================
     */

    const codeToValidate =
      structuredEditAlreadyDone
        ? nextProjectFiles
            .filter((file) =>
              String(file.path || "").endsWith(".dart")
            )
            .map((file) => file.content || "")
            .join("\n\n")
        : updatedCode;

    const syntaxCheck =
      checkFlutterCodeSyntax(
        codeToValidate
      );

    if (!syntaxCheck.valid) {
      console.error(
        "Claude returned invalid Flutter code:"
      );

      console.error(
        syntaxCheck.errors
      );

      return res.status(422).json({
        success:
          false,

        message:
          "Claude/Sonnet returned Flutter code that failed validation. The existing project code was not replaced.",

        validationErrors:
          syntaxCheck.errors,

        source:
          "claude-sonnet-project-chat-edit",
      });
    }

    /*
     * ============================================================
     * STRUCTURE UPDATED PROJECT
     * ============================================================
     *
     * For a multi-file edit, structured files already came from
     * Claude.
     *
     * For a single-file edit, convert the returned main.dart
     * into the same projectFiles representation used by the
     * initial-generation system.
     *
     * IMPORTANT:
     *
     * buildStructuredProject() accepts a STRING:
     *
     *     buildStructuredProject(updatedCode)
     *
     * NOT:
     *
     *     buildStructuredProject({
     *       mainCode: updatedCode
     *     })
     */

    if (!structuredEditAlreadyDone) {
      const structuredEdit =
        buildStructuredProject(
          updatedCode
        );

      nextProjectFiles =
        structuredEdit.files;

      nextFileManifest =
        filesToManifest(
          nextProjectFiles
        );

      nextEntrypoint =
        structuredEdit.entrypoint ||
        "lib/main.dart";
    } else {
      /*
       * For a structured edit, make sure the validated
       * main.dart content is also reflected inside the
       * projectFiles array.
       */

      nextProjectFiles =
        nextProjectFiles.map(
          (file) => {
            if (
              file.path ===
              "lib/main.dart"
            ) {
              return {
                ...file,
                content:
                  updatedCode,
              };
            }

            return file;
          }
        );

      nextFileManifest =
        filesToManifest(
          nextProjectFiles
        );
    }

    /*
     * ============================================================
     * UPDATE PROJECT METADATA
     * ============================================================
     */

    project.storageMode =
      nextStorageMode;

    project.tableSql =
      nextTableSql;

    project.supabaseTable =
      nextSupabaseTable;

    project.appConfig =
      nextAppConfig;

    project.appSpec =
      nextAppSpec;

    project.requirements =
      nextRequirements;

    project.componentPlan =
      nextComponentPlan;

    project.fileManifest =
      nextFileManifest;

    project.projectFiles =
      nextProjectFiles;

    project.entrypoint =
      nextEntrypoint;

    /*
     * ============================================================
     * SUPABASE DETECTION / SYNCHRONIZATION
     * ============================================================
     *
     * If the updated project is Supabase-based, preserve/update
     * Supabase metadata.
     */

    const isSupabase =
      project.storageMode ===
        "supabase" ||
      isSupabaseCode(
        updatedCode
      );

    if (isSupabase) {
      project.storageMode =
        "supabase";

      const config =
        reconstructAppConfigFromCode(
          updatedCode,
          finalInstruction
        ) || {};

      const extracted =
        extractSupabaseConfigFromCode(
          updatedCode
        );

      const tableName =
        project.supabaseTable ||
        extracted.tableName ||
        config.tableName ||
        deriveTableName({
          entity:
            config.entity ||
            project.title,
        });

      const fields =
        config.fields &&
        config.fields.length > 0
          ? config.fields
          : [];

      project.tableSql =
        generateTableSql(
          tableName,
          fields
        );

      if (
        !project.supabaseTable
      ) {
        project.supabaseTable =
          tableName;
      }

      if (
        !project.supabaseUrl &&
        extracted.supabaseUrl
      ) {
        project.supabaseUrl =
          extracted.supabaseUrl;
      }

      if (
        !project.supabaseAnonKey &&
        extracted.supabaseAnonKey
      ) {
        project.supabaseAnonKey =
          extracted.supabaseAnonKey;
      }
    }

    /*
     * ============================================================
     * SAVE UPDATED CODE
     * ============================================================
     */

    project.generatedCode =
      updatedCode;

    project.currentCode =
      updatedCode;

    project.latestPrompt =
      finalInstruction;

    project.generationSource =
      editSource;

    project.status =
      "updated";

    /*
     * ============================================================
     * CALCULATE NEXT VERSION NUMBER
     * ============================================================
     */

    const highestCapturedVersion =
      (
        project.versions ||
        []
      ).reduce(
        (
          highest,
          item
        ) =>
          Math.max(
            highest,
            Number(
              item?.version ||
                0
            )
          ),
        0
      );

    project.version =
      Math.max(
        Number(
          project.version ||
            1
        ),
        highestCapturedVersion
      ) + 1;

    /*
     * ============================================================
     * CHAT HISTORY
     * ============================================================
     */

    project.messages =
      project.messages ||
      [];

    project.messages.push({
      role:
        "user",

      content:
        finalInstruction,

      createdAt:
        new Date(),
    });

    const assistantContent =
      isSupabase
        ? "Changes were applied by Claude/Sonnet to the existing generated Flutter code. Updated Supabase SQL schema is ready."
        : "Changes were applied by Claude/Sonnet to the existing generated Flutter code.";

    project.messages.push({
      role:
        "assistant",

      content:
        assistantContent,

      source:
        editSource,

      generatedCode:
        updatedCode,

      createdAt:
        new Date(),
    });

    /*
     * ============================================================
     * CREATE PROJECT VERSION
     * ============================================================
     */

    project.versions =
      project.versions ||
      [];

    project.versions.push(
      buildProjectVersion({
        version:
          project.version,

        prompt:
          finalInstruction,

        source:
          editSource,

        generatedCode:
          updatedCode,

        storageMode:
          project.storageMode,

        tableSql:
          project.tableSql,

        supabaseTable:
          project.supabaseTable,

        appConfig:
          project.appConfig,

        appSpec:
          project.appSpec,

        requirements:
          project.requirements,

        componentPlan:
          project.componentPlan,

        fileManifest:
          project.fileManifest,

        projectFiles:
          project.projectFiles,

        entrypoint:
          project.entrypoint,

        createdAt:
          new Date(),
      })
    );

    /*
     * ============================================================
     * SAVE PROJECT
     * ============================================================
     */

    await project.save();

    /*
     * ============================================================
     * RETURN UPDATED PROJECT
     * ============================================================
     *
     * Return multiple compatible field names because the existing
     * frontend can consume any of these:
     *
     *   updatedCode
     *   generatedCode
     *   code
     */

    return res.json({
      success:
        true,

      message:
        "Project updated successfully by Claude/Sonnet.",

      project,

      updatedCode:
        updatedCode,

      generatedCode:
        updatedCode,

      code:
        updatedCode,

      projectFiles:
        project.projectFiles,

      fileManifest:
        project.fileManifest,

      entrypoint:
        project.entrypoint,

      source:
        editSource,

      storageMode:
        project.storageMode,

      tableSql:
        project.tableSql,

      tableName:
        project.supabaseTable,
    });

  } catch (error) {
    console.error(
      "Project chat edit error:",
      error
    );

    /*
     * ============================================================
     * MONGOOSE VERSION CONFLICT
     * ============================================================
     */

    if (
      error?.name ===
      "VersionError"
    ) {
      return res.status(409).json({
        success:
          false,

        message:
          "This project changed while your edit was being applied. Refresh the project and submit the edit again.",
      });
    }

    /*
     * ============================================================
     * GENERIC ERROR
     * ============================================================
     */

    return res.status(500).json({
      success:
        false,

      message:
        error?.message ||
        "Failed to update project.",
    });
  }
});

module.exports =
  router;