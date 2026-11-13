// This is the compiler contract, not the broader aspirational component catalogue.
function inferViews(prompt, entities, relationships) {
  const views = [];
  if (/calendar/i.test(prompt)) {
    const entity = entities.find((e) => /shootDay|appointment|event|booking/i.test(e.id)) || entities.find((e) => e.fields.some((f) => f.type === "date"));
    const field = entity?.fields.find((f) => f.id === "date") || entity?.fields.find((f) => f.type === "date");
    if (field) views.push({ id: "calendar", type: "calendar", entityId: entity.id, dateField: field.id, title: `${entity.name} calendar` });
  }
  if (/budget\s*(?:vs\.?|versus)\s*(?:actual|expenses)/i.test(prompt)) {
    for (const parent of entities) {
      const budget = parent.fields.find((f) => /budget/i.test(f.id));
      const relation = relationships.find((r) => r.sourceEntity === parent.id && r.targetField && entities.find((e) => e.id === r.targetEntity)?.fields.some((f) => f.id === "amount"));
      if (budget && relation) views.push({ id: `${parent.id}Budget`, type: "budget", entityId: parent.id, budgetField: budget.id, expenseEntity: relation.targetEntity, foreignKey: relation.targetField, amountField: "amount", title: `${parent.name} budget vs actual` });
    }
  }
  return views;
}

function auditCompilerSpec(spec) {
  const issues = [];
  const add = (id, reason) => issues.push({ id, type: "unsupportedCapability", reason });
  for (const key of ["workflows", "computedFields", "customCapabilities"]) {
    for (const item of spec[key] || []) add(item.id || key, `${key} requires a verified implementation before compilation.`);
  }
  for (const rule of spec.rules || []) if (!["confirmAction", "referentialIntegrity"].includes(rule.type)) add(rule.id, `Rule ${rule.type} is not compiled.`);
  for (const screen of spec.screens || []) if (["custom", "reports"].includes(screen.type)) add(screen.id, `Screen ${screen.id} has no compiled renderer.`);
  for (const r of spec.relationships || []) if (r.onDelete === "custom") add(r.id, "Custom delete policies are not compiled.");
  for (const entity of spec.entities) for (const field of entity.fields) {
    if (['computed', 'multiselect'].includes(field.type)) add(`${entity.id}.${field.id}`, `Field type ${field.type} needs a compiled renderer before use.`);
    if (field.validation && Object.keys(field.validation).length) add(`${entity.id}.${field.id}.validation`, 'Custom field validation is not compiled; only required, numeric, email, date, uniqueness and reference checks are built in.');
  }
  if (Object.keys(spec.seedData || {}).length) {
    for (const entity of spec.entities) {
      const rows = spec.seedData[entity.id];
      if (!Array.isArray(rows) || rows.length !== 3) { add(`seed_${entity.id}`, 'Provide exactly three seed rows per entity with stable entity-1, entity-2, entity-3 IDs.'); continue; }
      rows.forEach((row, index) => {
        if (row.id !== `${entity.id}-${index + 1}`) add(`seed_${entity.id}_${index}`, 'Seed IDs must be stable entity-1, entity-2, entity-3 IDs.');
        for (const field of entity.fields) {
          if (field.required && (row[field.id] == null || row[field.id] === '')) add(`seed_${entity.id}_${field.id}`, 'Required seed field is missing.');
          if (field.referenceEntity && row[field.id] && !spec.seedData[field.referenceEntity]?.some(parent => parent.id === row[field.id])) add(`seed_reference_${field.id}`, 'Seed reference points to a nonexistent parent.');
        }
      });
    }
  }
  for (const view of spec.views || []) {
    const entity = spec.entities.find((e) => e.id === view.entityId);
    const has = (e, id) => e?.fields.some((f) => f.id === id);
    if (view.type === "calendar") {
      if (!has(entity, view.dateField)) add(view.id, "Calendar references a missing date field.");
    } else if (view.type === "budget") {
      const expense = spec.entities.find((e) => e.id === view.expenseEntity);
      if (!has(entity, view.budgetField) || !has(expense, view.amountField) || !has(expense, view.foreignKey)) add(view.id, "Budget view references missing fields.");
    } else add(view.id, `Unknown view type: ${view.type}`);
  }
  return issues;
}

module.exports = { inferViews, auditCompilerSpec };
