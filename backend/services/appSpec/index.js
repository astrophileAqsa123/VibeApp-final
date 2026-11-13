const constants = require("./constants");
const { normalizeAppSpec } = require("./normalize");
const { validateAppSpec } = require("./validate");
const { applySpecPatch } = require("./patch");
const { evaluateRequirementCoverage } = require("./coverage");
const { contrastRatio, toIdentifier } = require("./utils");

function normalizeAndValidateAppSpec(rawSpec, options = {}) {
  const normalized = normalizeAppSpec(rawSpec, options);
  const semantic = validateAppSpec(normalized.spec);
  return {
    valid: normalized.valid && semantic.valid,
    spec: normalized.spec,
    errors: [...normalized.errors, ...semantic.errors],
    warnings: [...normalized.warnings, ...semantic.warnings],
  };
}

module.exports = {
  ...constants,
  normalizeAppSpec: normalizeAndValidateAppSpec,
  normalizeAndValidateAppSpec,
  validateAppSpec,
  applySpecPatch,
  evaluateRequirementCoverage,
  contrastRatio,
  toIdentifier,
};
