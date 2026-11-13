const express = require("express");
const { generateFlutterCode, editFlutterCode } = require("../services/aiService");
const auth = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 10, prefix: "ai" });

const SUPPORTED_SUGGESTIONS = [
  "Build notepad app",
  "Create student management app",
  "Create product inventory app in green color",
  "Create appointment booking app",
];

function safeAiErrorMessage(error) {
  const raw = String(error?.message || error || "").toLowerCase();

  if (
    raw.includes("decommissioned") ||
    raw.includes("model_not_found") ||
    raw.includes("does not exist") ||
    raw.includes("do not have access")
  ) {
    return "AI fallback is unavailable right now. Please use a VibeApp CRUD template prompt such as notepad, student management, inventory, product catalog, appointment, task, or expense tracker.";
  }

  if (
    raw.includes("rate limit") ||
    raw.includes("token") ||
    raw.includes("too large")
  ) {
    return "This request is too large for one AI edit. Try one smaller change at a time, such as theme, field, layout, or login screen.";
  }

  if (raw.includes("api key")) {
    return "AI service is not configured. VibeApp local templates can still work, but AI fallback needs GROQ_API_KEY.";
  }

  return "VibeApp could not process this AI request safely. Try a supported Flutter CRUD app prompt.";
}

function aiErrorStatus(error) {
  const raw = String(error?.message || error || "").toLowerCase();
  if (raw.includes("rate limit") || error?.status === 429) return 429;
  if (raw.includes("api key") || raw.includes("unavailable")) return 503;
  return 500;
}

router.post("/generate", auth, aiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        unsupported: true,
        shouldFallback: false,
        message: "Please describe the Flutter CRUD app you want to create.",
        suggestions: SUPPORTED_SUGGESTIONS,
      });
    }

    const code = await generateFlutterCode(prompt);

    return res.json({
      success: true,
      code,
      generatedCode: code,
      source: "groq-ai",
    });
  } catch (error) {
    console.error("AI route generate error:", error);

    return res.status(aiErrorStatus(error)).json({
      success: false,
      unsupported: true,
      shouldFallback: false,
      message: safeAiErrorMessage(error),
      suggestions: SUPPORTED_SUGGESTIONS,
    });
  }
});

router.post("/edit", auth, aiLimiter, async (req, res) => {
  try {
    const {
      instruction,
      message,
      prompt,
      existingCode,
      currentCode,
      generatedCode,
      originalPrompt,
    } = req.body || {};

    const finalInstruction = instruction || message || prompt;
    const finalCode = existingCode || currentCode || generatedCode;

    if (!finalInstruction || !String(finalInstruction).trim()) {
      return res.status(400).json({
        success: false,
        unsupported: true,
        shouldFallback: false,
        message: "Please describe the change you want to apply.",
        suggestions: [
          "Change theme to blue",
          "Add phone number field",
          "Make cards more modern",
          "Add login signup page",
        ],
      });
    }

    if (!finalCode || !String(finalCode).trim()) {
      return res.status(400).json({
        success: false,
        unsupported: true,
        shouldFallback: false,
        message: "Existing generated app code is missing. Please generate an app first.",
        suggestions: SUPPORTED_SUGGESTIONS,
      });
    }

    const code = await editFlutterCode({
      instruction: finalInstruction,
      existingCode: finalCode,
      originalPrompt: originalPrompt || "",
    });

    return res.json({
      success: true,
      code,
      updatedCode: code,
      generatedCode: code,
      source: "groq-ai-edit",
    });
  } catch (error) {
    console.error("AI route edit error:", error);

    return res.status(200).json({
      success: false,
      unsupported: true,
      shouldFallback: false,
      message: safeAiErrorMessage(error),
      suggestions: [
        "Change theme to blue",
        "Add phone number field",
        "Make cards more modern",
        "Add login signup page",
      ],
    });
  }
});

module.exports = router;
