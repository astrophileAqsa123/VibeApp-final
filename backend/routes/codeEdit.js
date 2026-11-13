const express = require("express");
const { applyLocalCodeEdit, applyExtendedLocalPatch } = require("../services/localCodeEditService");
const { editFlutterCodeWithGroq } = require("../services/groqCodeEditService");
const { editFlutterCodeWithGroqDiff } = require("../services/groqDiffEditService");
const {
  sanitizeGeneratedFlutterCode,
  checkFlutterCodeSyntax,
} = require("../services/exact500AppTemplates/flutterCodeSafety");
const { attemptGroqSyntaxRepair } = require("../services/aiService");
const auth = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const editLimiter = createRateLimiter({ windowMs: 60_000, max: 15, prefix: "code-edit" });

const MAX_GROQ_CODE_CHARS = Number(process.env.MAX_GROQ_CODE_CHARS || 18000);

function getCleanErrorMessage(error) {
  const raw = error?.message || "";

  if (
    raw.toLowerCase().includes("tokens per minute") ||
    raw.toLowerCase().includes("request too large") ||
    raw.toLowerCase().includes("rate limit")
  ) {
    return "This edit is too large for AI editing on the current API limit. Try one smaller change at a time, or use template-supported changes like theme, field, card style, or layout.";
  }

  if (raw.toLowerCase().includes("api key")) {
    return "AI editing is not configured. Please check GROQ_API_KEY in backend .env.";
  }

  return "Failed to update Flutter code.";
}

async function handleCodeEdit(req, res) {
  try {
    const {
      instruction,
      message,
      prompt,
      existingCode,
      currentCode,
      generatedCode,
      originalPrompt,
      storageMode,
      supabaseUrl,
      supabaseAnonKey,
      supabaseTable,
    } = req.body;

    const finalInstruction = instruction || message || prompt;
    const finalCode = existingCode || currentCode || generatedCode;

    if (!finalInstruction || !String(finalInstruction).trim()) {
      return res.status(400).json({
        success: false,
        message: "Change instruction is required.",
      });
    }

    if (!finalCode || !String(finalCode).trim()) {
      return res.status(400).json({
        success: false,
        message: "Existing Flutter code is required.",
      });
    }

    const supabaseConfig = {
      storageMode: storageMode || (finalCode.includes("supabase_flutter") ? "supabase" : "local"),
      supabaseUrl: supabaseUrl || "",
      supabaseAnonKey: supabaseAnonKey || "",
      supabaseTable: supabaseTable || "",
    };

    const localResult = await applyLocalCodeEdit({
      instruction: finalInstruction,
      existingCode: finalCode,
      originalPrompt: originalPrompt || "",
      supabaseConfig,
      storageMode: supabaseConfig.storageMode,
      appConfig: req.body?.appConfig || null,
    });

    if (localResult.handled) {
      return res.json({
        success: true,
        message: localResult.message,
        code: localResult.code,
        updatedCode: localResult.code,
        generatedCode: localResult.code,
        source: localResult.source,
        changes: localResult.changes,
        usedGroq: false,
        storageMode: localResult.storageMode,
        tableSql: localResult.tableSql,
        tableName: localResult.tableName,
        appConfig: localResult.appConfig,
      });
    }

    // 2. Try extended local patches (button color, font size, elevation, etc.)
    const extendedResult = applyExtendedLocalPatch({
      instruction: finalInstruction,
      existingCode: finalCode,
    });

    if (extendedResult.handled) {
      return res.json({
        success: true,
        message: extendedResult.message,
        code: extendedResult.code,
        updatedCode: extendedResult.code,
        generatedCode: extendedResult.code,
        source: extendedResult.source,
        changes: extendedResult.changes,
        usedGroq: false,
      });
    }

    // 3. Not handled locally — use diff-mode Groq (sends only a relevant snippet, works on any size)
    let updatedCode = null;
    let usedGroq = false;

    try {
      const diffResult = await editFlutterCodeWithGroqDiff({
        instruction: finalInstruction,
        existingCode: finalCode,
        originalPrompt: originalPrompt || "",
      });
      updatedCode = diffResult.updatedCode;
      usedGroq = true;
    } catch (diffError) {
      console.warn("Diff-mode edit failed, trying full-rewrite:", diffError.message);

      // Fallback: full-rewrite Groq (only if code is small enough)
      if (String(finalCode).length > MAX_GROQ_CODE_CHARS) {
        return res.status(413).json({
          success: false,
          shouldRetryWithSmallerChange: true,
          message:
            "This change could not be applied automatically. Try a more specific instruction, or use a supported local edit: theme, field, layout, border radius, font size, button style, or card elevation.",
        });
      }

      const { updatedCode: fullRewriteCode } = await editFlutterCodeWithGroq({
        instruction: finalInstruction,
        existingCode: finalCode,
        originalPrompt: originalPrompt || "",
      });
      updatedCode = fullRewriteCode;
      usedGroq = true;
    }

    if (updatedCode) {
      updatedCode = sanitizeGeneratedFlutterCode(updatedCode);
      const syntaxCheck = checkFlutterCodeSyntax(updatedCode);
      if (!syntaxCheck.valid) {
        console.warn("Edited code had syntax issues:", syntaxCheck.errors);
        const repaired = await attemptGroqSyntaxRepair(updatedCode, syntaxCheck.errors);
        if (repaired && checkFlutterCodeSyntax(repaired).valid) {
          console.log("1-shot Groq edit repair succeeded!");
          updatedCode = repaired;
        }
      }
    }

    return res.json({
      success: true,
      message: "Flutter code updated successfully.",
      code: updatedCode,
      updatedCode,
      generatedCode: updatedCode,
      source: "groq-diff-edit",
      usedGroq,
    });
  } catch (error) {
    console.error("Code edit route error:", error);

    return res.status(500).json({
      success: false,
      message: getCleanErrorMessage(error),
    });
  }
}

router.post("/", auth, editLimiter, handleCodeEdit);
router.post("/update", auth, editLimiter, handleCodeEdit);
router.post("/flutter", auth, editLimiter, handleCodeEdit);

module.exports = router;
