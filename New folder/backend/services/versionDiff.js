function fieldMap(spec) {
  const map = new Map();
  for (const entity of spec?.entities || []) {
    for (const field of entity.fields || []) map.set(`${entity.id}.${field.id}`, field);
  }
  return map;
}

function entityMap(spec) { return new Map((spec?.entities || []).map((entity) => [entity.id, entity])); }
function roleMap(spec) { return new Map((spec?.roles || []).map((role) => [role.id, role])); }

function diffMaps(before, after, label) {
  const changes = [];
  for (const [id, item] of after) if (!before.has(id)) changes.push({ type: 'added', area: label, id, label: item.label || item.name || id });
  for (const [id, item] of before) if (!after.has(id)) changes.push({ type: 'removed', area: label, id, label: item.label || item.name || id });
  return changes;
}

function diffAppSpecs(before = null, after = null) {
  if (!before || !after) return { available: false, changes: [], summary: 'Structured AppSpec diff is unavailable for one or both versions.' };
  const changes = [
    ...diffMaps(entityMap(before), entityMap(after), 'entity'),
    ...diffMaps(fieldMap(before), fieldMap(after), 'field'),
    ...diffMaps(roleMap(before), roleMap(after), 'role'),
  ];
  const beforePreset = before.uiPreset || before.designPreset || 'modern';
  const afterPreset = after.uiPreset || after.designPreset || 'modern';
  if (beforePreset !== afterPreset) changes.push({ type: 'changed', area: 'design', id: 'uiPreset', from: beforePreset, to: afterPreset, label: `UI preset: ${beforePreset} → ${afterPreset}` });
  const beforeAuth = Boolean(before.authentication?.enabled || before.features?.hasAuth);
  const afterAuth = Boolean(after.authentication?.enabled || after.features?.hasAuth);
  if (beforeAuth !== afterAuth) changes.push({ type: 'changed', area: 'authentication', id: 'enabled', from: beforeAuth, to: afterAuth, label: `Authentication ${afterAuth ? 'enabled' : 'disabled'}` });
  return { available: true, changes, summary: changes.length ? `${changes.length} structural change${changes.length === 1 ? '' : 's'} detected.` : 'No structural AppSpec changes detected.' };
}

module.exports = { diffAppSpecs };
