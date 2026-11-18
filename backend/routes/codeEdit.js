const express = require("express");

const {
  editFlutterCodeWithClaude,
} = require("../services/claudeCodeService");

const auth = require("../middleware/authMiddleware");

const {
  createRateLimiter,
} = require("../middleware/rateLimit");

const router = express.Router();

const editLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 15,
  prefix: "code-edit",
});

function getCleanErrorMessage(error) {
  const raw = error?.message || "";

  if (
    raw.toLowerCase().includes("tokens per minute") ||
    raw.toLowerCase().includes("request too large") ||
    raw.toLowerCase().includes("rate limit")
  ) {
    return (
      "This edit is too large for AI editing on the current API limit. " +
      "Try one smaller change at a time."
    );
  }

  if (
    raw.toLowerCase().includes("api key") ||
    raw.toLowerCase().includes("authentication")
  ) {
    return (
      "Claude/Sonnet editing is not configured. " +
      "Please check ANTHROPIC_API_KEY or CLAUDE_API_KEY in backend .env."
    );
  }

  if (
    raw.toLowerCase().includes("model") &&
    raw.toLowerCase().includes("not available")
  ) {
    return raw;
  }

  return raw || "Failed to update Flutter code.";
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

    const finalInstruction =
      instruction ||
      message ||
      prompt;

    const finalCode =
      existingCode ||
      currentCode ||
      generatedCode;

    if (
      !finalInstruction ||
      !String(finalInstruction).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Change instruction is required.",
      });
    }

    if (
      !finalCode ||
      !String(finalCode).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Existing Flutter code is required.",
      });
    }

    /*
     * Claude/Sonnet receives:
     *
     * 1. Original app prompt
     * 2. Current complete Flutter code
     * 3. User's requested change
     *
     * Claude returns the COMPLETE updated main.dart.
     */
    const claudeCode =
      await editFlutterCodeWithClaude({
        instruction:
          finalInstruction,

        existingCode:
          finalCode,

        originalPrompt:
          originalPrompt || "",
      });

    return res.json({
      success: true,

      message:
        "Flutter code updated successfully with Claude/Sonnet.",

      code: claudeCode,

      updatedCode:
        claudeCode,

      generatedCode:
        claudeCode,

      source:
        "claude-sonnet-code-edit",

      usedClaude: true,

      usedGroq: false,
    });

  } catch (error) {
    console.error(
      "Code edit route error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        getCleanErrorMessage(error),
    });
  }
}

router.post(
  "/",
  auth,
  editLimiter,
  handleCodeEdit
);

router.post(
  "/update",
  auth,
  editLimiter,
  handleCodeEdit
);

router.post(
  "/flutter",
  auth,
  editLimiter,
  handleCodeEdit
);

module.exports = router;