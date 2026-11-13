function evaluateRequirementCoverage(spec = {}) {
  const requirements = Array.isArray(spec.requirements) ? spec.requirements : [];
  const selected = new Set(spec.selectedCapabilities || []);
  const allReferences = new Set([
    ...(spec.entities || []).map((item) => `entity.${item.id}`),
    ...(spec.entities || []).flatMap((entity) => (entity.fields || []).map((field) => `field.${entity.id}.${field.id}`)),
    ...(spec.relationships || []).map((item) => `relationship.${item.id}`),
    ...(spec.screens || []).map((item) => `screen.${item.id}`),
    ...(spec.views || []).map((item) => `view.${item.id}`),
    ...(spec.roles || []).map((item) => `role.${item.id}`),
    ...(spec.rules || []).map((item) => `rule.${item.id}`),
    ...(spec.workflows || []).map((item) => `workflow.${item.id}`),
    ...(spec.customCapabilities || []).map((item) => `custom.${item.id}`),
    ...selected,
  ]);
  const knownPrefixes = [...allReferences].map((reference) => `${reference}.`);
  const results = requirements.map((requirement, index) => {
    const mappings = Array.isArray(requirement.implementedBy) ? requirement.implementedBy : [];
    const missingMappings = mappings.filter((mapping) => {
      const value = String(mapping);
      return !allReferences.has(value) && !knownPrefixes.some((prefix) => value.startsWith(prefix));
    });
    const status = requirement.status === "notApplicable"
      ? "notApplicable"
      : mappings.length && !missingMappings.length
      ? "covered"
      : "uncovered";
    return { ...requirement, id: requirement.id || `R${index + 1}`, status, missingMappings };
  });
  return {
    requirements: results,
    covered: results.filter((item) => item.status === "covered").map((item) => item.id),
    uncovered: results.filter((item) => item.status === "uncovered").map((item) => item.id),
    complete: results.every((item) => item.status !== "uncovered"),
  };
}

module.exports = { evaluateRequirementCoverage };
