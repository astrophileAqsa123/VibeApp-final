// Builds the "current app" context sent to the model when editing an existing
// AppSpec. Sending the whole spec on every edit scales with app size and used to
// hit the provider's request-token limit on bigger apps. The model only needs:
//   * every entity/field ID (to reference them in operations), and
//   * full detail for the entities the instruction actually talks about.
//
// Tiers, from richest to smallest. The caller steps down a tier when the payload
// is still too large or the provider rejects the request as too large.
//   0  full detail for entities named in the instruction, one-line summaries for the rest
//   1  one-line summaries for everything
//   2  entity ids and field ids only
//
// Operations are applied to the real saved spec locally, so a smaller context can
// never lose data - it only limits what the model can see while planning.

const DEFAULT_MAX_CHARS = Number(process.env.EDIT_CONTEXT_MAX_CHARS || 9000);
const MAX_TIER = 2;

function estimateTokens(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return Math.ceil(String(text || "").length / 3);
}

// True only when the *size* of the request is the problem (HTTP 413 / "request too
// large" / context window). A transient per-minute rate limit (429) is not fixed by
// sending less, so it is deliberately not matched here.
function isTokenLimitError(error) {
  const text = `${error?.status || ""} ${error?.message || error || ""}`.toLowerCase();
  if (/\b429\b/.test(text) && !/request too large/.test(text)) return false;
  return /\b413\b|request too large|context length|context window|maximum context|token budget|too many tokens|reduce (?:your )?(?:message|prompt|input)? ?(?:length|size)/.test(text);
}

function singularWord(word) {
  const w = String(word).toLowerCase();
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(w)) return w;
  if (w.endsWith("es") && /(sses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}

function splitWords(value = "") {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function instructionWordSet(instruction = "") {
  return new Set(splitWords(instruction).map(singularWord));
}

/** Entities whose name, id or plural name the instruction mentions. */
function mentionedEntityIds(spec, instruction) {
  const mentioned = instructionWordSet(instruction);
  const ids = new Set();
  for (const entity of spec.entities || []) {
    const candidates = [entity.id, entity.name, entity.pluralName].filter(Boolean);
    const matches = candidates.some((candidate) => {
      const parts = splitWords(candidate).map(singularWord);
      return parts.length > 0 && parts.every((part) => mentioned.has(part));
    });
    if (matches) ids.add(entity.id);
  }
  return ids;
}

function fieldSummary(field, withOptions) {
  let text = `${field.id}:${field.referenceEntity ? `ref->${field.referenceEntity}` : field.type || "text"}`;
  if (withOptions && Array.isArray(field.options) && field.options.length) text += `[${field.options.slice(0, 6).join("|")}]`;
  return text;
}

function fullEntity(entity) {
  return {
    id: entity.id,
    name: entity.name,
    displayField: entity.displayField,
    fields: (entity.fields || []).map((field) => {
      const out = { id: field.id, label: field.label, type: field.type };
      if (field.required) out.required = true;
      if (field.referenceEntity) out.referenceEntity = field.referenceEntity;
      if (Array.isArray(field.options) && field.options.length) out.options = field.options.slice(0, 12);
      return out;
    }),
  };
}

function relationshipSummary(relationship) {
  return {
    id: relationship.id,
    type: relationship.type,
    sourceEntity: relationship.sourceEntity,
    targetEntity: relationship.targetEntity,
    targetField: relationship.targetField,
    onDelete: relationship.onDelete,
  };
}

function viewSummary(view) {
  const { id, type, entityId, dateField, title } = view || {};
  return { id, type, entityId, dateField, title };
}

/**
 * @returns {{ text: string, tier: number, chars: number, detailedEntities: string[] }}
 */
function buildEditContext(spec = {}, instruction = "", options = {}) {
  const maxChars = Number(options.maxChars || DEFAULT_MAX_CHARS);
  const startTier = Math.min(MAX_TIER, Math.max(0, Number(options.tier) || 0));
  const entities = Array.isArray(spec.entities) ? spec.entities : [];
  const mentioned = mentionedEntityIds(spec, instruction);

  const render = (tier) => {
    const detailed = tier === 0 ? entities.filter((entity) => mentioned.has(entity.id)) : [];
    const detailedIds = new Set(detailed.map((entity) => entity.id));
    const summaries = {};
    for (const entity of entities) {
      if (detailedIds.has(entity.id)) continue;
      summaries[entity.id] = tier >= 2
        ? (entity.fields || []).map((field) => field.id).join(",")
        : `${entity.name || entity.id} | display:${entity.displayField || "?"} | ${(entity.fields || []).map((field) => fieldSummary(field, true)).join(", ")}`;
    }
    const payload = {
      app: { id: spec.app?.id, name: spec.app?.name },
      theme: tier >= 2 ? undefined : spec.theme,
      detailedEntities: detailed.map(fullEntity),
      otherEntities: summaries,
      relationships: (spec.relationships || []).map(relationshipSummary),
      views: (spec.views || []).map(viewSummary),
    };
    return { text: JSON.stringify(payload), detailedEntities: [...detailedIds] };
  };

  for (let tier = startTier; tier <= MAX_TIER; tier += 1) {
    const rendered = render(tier);
    if (rendered.text.length <= maxChars || tier === MAX_TIER) {
      return { ...rendered, tier, chars: rendered.text.length };
    }
  }
  /* istanbul ignore next */
  return { ...render(MAX_TIER), tier: MAX_TIER, chars: 0 };
}

module.exports = { buildEditContext, mentionedEntityIds, estimateTokens, isTokenLimitError, MAX_TIER, DEFAULT_MAX_CHARS };
