const { editFlutterCodeWithClaude } = require("./claudeCodeService");
const { editFlutterCodeWithGroqDiff } = require("./groqDiffEditService");
const { shouldFallbackToGroq } = require("./aiFallbackPolicy");

function normalizeCodeResult(result) {
  if (typeof result === "string") return result;
  return result?.code || result?.updatedCode || result?.generatedCode || "";
}

async function editSingleFileWithFallback({
  instruction,
  currentCode,
  appSpec = null,
  originalPrompt = "",
  supabaseConfig = null,
}) {
  try {
    const claudeResult = await editFlutterCodeWithClaude({
      prompt: instruction,
      currentCode,
      appSpec,
      originalPrompt,
      supabaseConfig,
    });

    return {
      code: normalizeCodeResult(claudeResult),
      source: claudeResult?.source || "claude-sonnet-edit",
      provider: "claude",
      usedClaude: true,
      usedGroq: false,
      quotaFallback: false,
    };
  } catch (claudeError) {
    console.error("Claude edit failed:", claudeError);

    if (!shouldFallbackToGroq(claudeError)) {
      throw claudeError;
    }

    console.warn("Claude account/token quota exhausted. Switching to Groq diff fallback.");

    const groqResult = await editFlutterCodeWithGroqDiff({
      instruction,
      existingCode: currentCode,
      originalPrompt,
    });

    return {
      code: groqResult.updatedCode,
      source: "groq-token-exhaustion-diff-fallback",
      provider: "groq",
      usedClaude: true,
      usedGroq: true,
      quotaFallback: true,
    };
  }
}

module.exports = {
  editSingleFileWithFallback,
};
