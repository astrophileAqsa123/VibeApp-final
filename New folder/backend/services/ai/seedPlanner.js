const { seedValue } = require('../multiEntityFlutterCompiler');

// Generate data in small batches so seed records do not consume the schema budget.
async function populateSeedData(spec, complete) {
  const seedData = Object.fromEntries(spec.entities.map(entity => [entity.id, [0, 1, 2].map(index => Object.fromEntries([
    ['id', `${entity.id}-${index + 1}`],
    ...entity.fields.map(field => [field.id, seedValue(entity, field, index, spec.entities)]),
  ]))]));
  const warnings = [];
  for (let start = 0; start < spec.entities.length; start += 2) {
    const entities = spec.entities.slice(start, start + 2);
    try {
      const response = await complete([
        { role: 'system', content: 'Return JSON only: {"entityId":[{fieldId:value}, {fieldId:value}, {fieldId:value}]}. Generate exactly three realistic fictional sample records per supplied entity. Respect field types and options. Do not add fields. Do not return IDs or references; the application supplies those. Use ISO dates and numeric JSON values for number fields.' },
        { role: 'user', content: JSON.stringify({ app: spec.app.name, entities: entities.map(e => ({ id: e.id, fields: e.fields.filter(f => !f.referenceEntity) })) }) },
      ], { maxTokens: 1800 });
      const parsed = typeof response === 'string' ? JSON.parse(response.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')) : response;
      for (const entity of entities) {
        if (!Array.isArray(parsed[entity.id]) || parsed[entity.id].length !== 3) throw new Error(`Missing samples for ${entity.id}`);
        parsed[entity.id].forEach((row, index) => {
          for (const field of entity.fields.filter(f => !f.referenceEntity)) {
            const value = row[field.id];
            if (value == null || typeof value === 'object') continue;
            if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) continue;
            if (field.type === 'boolean' && typeof value !== 'boolean') continue;
            if (field.options?.length && !field.options.includes(value)) continue;
            if (field.required && String(value).trim() === '') continue;
            seedData[entity.id][index][field.id] = value;
          }
        });
      }
    } catch (error) {
      warnings.push(`Domain sample generation unavailable for ${entities.map(e => e.name).join(', ')}; structurally valid generic samples were used.`);
      // Do not keep hitting a rate-limited or unavailable provider for later batches.
      break;
    }
  }
  return { seedData, warnings };
}

module.exports = { populateSeedData };
