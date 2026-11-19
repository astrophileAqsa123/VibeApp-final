function getErrorText(error) {
  return String(error?.message || error?.error?.message || error || "").toLowerCase();
}

function isClaudeTokenQuotaExhausted(error) {
  const text = getErrorText(error);
  const markers = [
    "credit balance is too low",
    "insufficient credits",
    "out of credits",
    "credits exhausted",
    "credit limit exceeded",
    "usage limit exceeded",
    "monthly usage limit",
    "monthly token limit",
    "token quota exceeded",
    "token quota exhausted",
    "token limit exceeded",
    "tokens exhausted",
    "api quota exceeded",
    "quota exceeded",
    "spending limit exceeded",
  ];
  return markers.some((m) => text.includes(m));
}

function shouldFallbackToGroq(error) {
  return isClaudeTokenQuotaExhausted(error);
}

module.exports = {
  getErrorText,
  isClaudeTokenQuotaExhausted,
  shouldFallbackToGroq,
};
