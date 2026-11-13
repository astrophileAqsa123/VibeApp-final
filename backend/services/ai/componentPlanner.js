const Groq = require("groq-sdk");
const { normalizeAppSpec, evaluateRequirementCoverage, applySpecPatch } = require("../appSpec");
const { ComponentRegistry, resolveComponents } = require("../components");
const { planStructuredPrompt, auditExplicitRequest } = require("./structuredPromptPlanner");
const { inferViews, auditCompilerSpec } = require("../appSpec/compilerCapabilities");
const { populateSeedData } = require("./seedPlanner");

const DEPRECATED_MODELS = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "qwen/qwen3.6-27b"]);
const configuredModel = String(process.env.GROQ_MODEL || "").trim();
const MODEL_CHAIN = [
  configuredModel && !DEPRECATED_MODELS.has(configuredModel) ? configuredModel : null,
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
].filter(Boolean);

function stripJsonFence(value = "") {
  return String(value).replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function mapCompilerProvidedRequirements(requirements = []) {
  return requirements.map((requirement) => {
    if (Array.isArray(requirement.implementedBy) && requirement.implementedBy.length) return requirement;
    const text = `${requirement.category || ""} ${requirement.text || ""}`.toLowerCase();
    let component = null;
    if (/confirm.*delet|delet.*confirm/.test(text)) component = "rule.standard";
    else if (/sample|seed|first[- ]run/.test(text)) component = "core.seed";
    else if (/empty.*loading.*error|ui state|loading state|error state|empty state/.test(text)) component = "core.uiStates";
    else if (/local.*persist|persist.*local|offline storage/.test(text)) component = "core.storage.local";
    return component ? { ...requirement, implementedBy: [component] } : requirement;
  });
}

function classifyCapabilityTags(prompt = "") {
  const text = String(prompt).toLowerCase();
  const tags = new Set(["core", "crud", "entity", "navigation", "theme", "screen", "storage"]);
  if (/\b(login|sign ?in|sign ?up|auth|password|user account)\b/.test(text)) tags.add("auth");
  if (/\b(otp|verification|verify|magic link)\b/.test(text)) tags.add("verification");
  if (/\b(role|permission|admin|manager|viewer|read.?only)\b/.test(text)) {
    tags.add("roles");
    tags.add("permissions");
    tags.add("auth");
  }
  if (/\b(related|relationship|belongs to|has many|multiple authors|many to many|one to many)\b/.test(text)) tags.add("relationship");
  if (/\b(workflow|approval|status transition|stage)\b/.test(text)) tags.add("workflow");
  if (/\b(rule|prevent|must not|automatically|calculate|computed|conflict)\b/.test(text)) tags.add("businessLogic");
  if (/\b(dashboard|metric|summary|statistics|kpi)\b/.test(text)) tags.add("dashboard");
  if (/\b(profile)\b/.test(text)) tags.add("profile");
  if (/\b(settings|theme|dark mode|light mode)\b/.test(text)) tags.add("settings");
  if (/\b(splash)\b/.test(text)) tags.add("splash");
  return [...tags];
}

function buildPlannerMessages(prompt, registry = new ComponentRegistry(), currentSpec = null) {
  if (currentSpec) return [
    { role: "system", content: `Edit the CURRENT saved specification using explicit operations. Return JSON only: {"operations": [...], "assumptions": []}. Do not return a replacement appSpec. Preserve all stable IDs and unrelated features.
Supported operations: setAppName {value}, setTheme {value}, addEntity {entity}, removeEntity {entityId}, addField {entityId,field}, updateField {entityId,fieldId,changes}, removeField {entityId,fieldId}, addRelationship {relationship}, updateRelationship {relationshipId,changes}, removeRelationship {relationshipId}, upsertView {view}, removeView {viewId}. Each object needs op. IDs may not be renamed. Relationships use sourceEntity(parent), targetEntity(child), targetField, type oneToMany|oneToOne|manyToMany, onDelete restrict|cascade|detach. For unsupported changes return {"unsupportedReason":"explanation"}.` },
    { role: "user", content: `CURRENT saved specification:\n${JSON.stringify({ app: currentSpec.app, theme: currentSpec.theme, entities: currentSpec.entities, relationships: currentSpec.relationships, views: currentSpec.views })}\nRequested edit: ${prompt}` },
  ];
  const tags = classifyCapabilityTags(prompt);
  const manifest = registry.compactManifest(tags);
  return [
    {
      role: "system",
      content: `You are the planning engine for a component-based Flutter CRUD application builder.
Return JSON only. Do not return Dart, markdown, explanations, or component implementations.

Your job:
1. Extract every explicit requirement into an atomic requirement.
2. Design an AppSpec V2 that satisfies those requirements.
3. Map every requirement to one or more concrete spec paths through implementedBy.
4. Report behavior that cannot be represented by the available components as customCapabilities.

Important rules:
- Preserve every entity, field, relationship, role, permission, screen, search requirement, confirmation, deletion rule, workflow and theme request.
- Plan enough meaningful primary screens to cover the application's real workflows. Do not target a fixed screen count or add generic analytics/reports/favorites as filler; use domain and entities to choose useful workflows.
- Give every screen a distinct responsibility and data contract. Never satisfy the screen count by repeating one generic card/list layout with the same values under different titles; define different data, actions, states and visualization needs for each route.
- Use stable camelCase IDs. References must use IDs, never labels.
- Default authentication fields are username and password when authentication is requested without fields.
- For one-to-many relationships, sourceEntity is the parent and targetEntity is the child.
- Every foreign key must have a relationship and a reference field, never a plain text ID input.
- Model relationship attributes (such as a person's role in each project) as a join entity with required parent references and editable attributes.
- Choose name or title as displayField, never a foreign key when a descriptive field exists.
- Keep this planning response compact. Do not generate sample records here; a separate data-generation stage supplies them.
- views supports {id,type:"calendar",entityId,dateField,title} and {id,type:"budget",entityId,budgetField,expenseEntity,foreignKey,amountField,title}.
- Do not claim an unsupported custom capability is implemented just because it exists in the spec.
- If a child relationship is required, onDelete cannot be detach.
- If deleting a parent must not delete required children, use restrict.
- Viewer/read-only roles receive only read permission.
- Unknown business behavior must be listed in customCapabilities instead of being omitted.
- Use only these field types: text, textarea, number, date, datetime, boolean, select, multiselect, email, phone, url, password, reference, computed, status.
- Screen objects must use {"id":"...","type":"entityList|entityDetails|entityForm|dashboard|login|signup|verification|splash|profile|settings|custom","title":"...","entityId":"..."}.
- Every required requirement must have at least one implementedBy entry pointing to a real spec path or available component ID.
- Model named child records, histories, logs, line items, or maintenance records as their own entity and relationship; do not leave them as an unimplemented custom capability.
- Use local storage when persistence is requested; otherwise use normalized in-memory storage.
- core.seed implements realistic first-run sample data. core.uiStates implements empty, loading and error states. rule.standard implements delete confirmation. core.storage.local implements local persistence.

Available component catalogue:
${JSON.stringify(manifest)}

Return this shape:
{
  "requirements": [{"id":"R1","text":"...","category":"...","priority":"required","implementedBy":["entity.book"]}],
  "assumptions": [],
  "appSpec": {
    "specVersion": 2,
    "app": {"id":"...","name":"...","description":"...","storageMode":"memory"},
    "theme": {},
    "authentication": {},
    "splash": {},
    "navigation": {},
    "entities": [],
    "relationships": [],
    "screens": [],
    "dashboards": [],
    "roles": [],
    "permissions": [],
    "rules": [],
    "workflows": [],
    "computedFields": [],
    "customCapabilities": []
  }
}`,
    },
    { role: "user", content: `${currentSpec ? `Edit this CURRENT saved specification. Preserve stable IDs, all fields, relationships, views and prior changes unless explicitly changed. Return the full updated specification.\n${JSON.stringify(currentSpec)}\n\n` : ""}Build an application plan for this request:\n${String(prompt || "").trim()}` },
  ];
}

async function defaultCompletion(messages, options = {}) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing in backend .env.");
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  let lastError = null;
  const estimatedInputTokens = Math.ceil(JSON.stringify(messages).length / 3);
  const outputBudget = Math.min(options.maxTokens || 4200, 7600 - estimatedInputTokens);
  if (outputBudget < 512) throw new Error('Application context exceeds the planning token budget. Reduce the request size.');
  for (const model of MODEL_CHAIN) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.1,
        max_tokens: outputBudget,
        response_format: { type: "json_object" },
      });
      const content = response?.choices?.[0]?.message?.content || "";
      if (response?.choices?.[0]?.finish_reason === 'length') throw new Error('Planner response was truncated; incomplete specifications are not accepted.');
      if (!content.trim()) throw new Error(`Planner model ${model} returned an empty response.`);
      JSON.parse(stripJsonFence(content));
      return content;
    } catch (error) {
      lastError = error;
      const text = String(error?.message || "").toLowerCase();
      if (text.includes("invalid api key") || text.includes("authentication") || text.includes("unauthorized")) throw error;
      console.warn(`Component planner model ${model} failed, trying next:`, error.message);
    }
  }
  throw lastError || new Error("No AI planning model is available.");
}

async function planApplication(prompt, options = {}) {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) throw new Error("Prompt is required.");
  const registry = options.registry || new ComponentRegistry();
  const complete = options.complete || defaultCompletion;
  let raw;
  try {
    const messages = buildPlannerMessages(cleanPrompt, registry, options.currentSpec);
    if (options.validationFeedback) messages[0].content += `\nA previous plan failed these checks. Correct all of them: ${JSON.stringify(options.validationFeedback)}`;
    raw = await complete(messages);
  } catch (error) {
    if (options.currentSpec) throw error; // Never silently replace an edit with the original app.
    const fallback = planStructuredPrompt(cleanPrompt, { registry });
    if (fallback) return fallback;
    throw error;
  }
  const parsed = typeof raw === "string" ? JSON.parse(stripJsonFence(raw)) : raw;
  if (options.currentSpec) {
    if (parsed.unsupportedReason) throw new Error(parsed.unsupportedReason);
    if (!Array.isArray(parsed.operations) || !parsed.operations.length) throw new Error("The edit planner returned no explicit changes.");
    const patched = applySpecPatch(options.currentSpec, parsed);
    const normalized = normalizeAppSpec(patched.spec);
    if (!normalized.valid) throw new Error(normalized.errors.join("; "));
    const missingCapabilities = auditCompilerSpec(normalized.spec);
    const resolution = resolveComponents(normalized.spec, registry);
    normalized.spec.selectedCapabilities = resolution.components.map(c => c.id);
    const coverage = evaluateRequirementCoverage(normalized.spec);
    return { ready: coverage.complete && !missingCapabilities.length, spec: normalized.spec, requirements: coverage.requirements, coverage, missingCapabilities, assumptions: parsed.assumptions || [], componentPlan: resolution.components, warnings: normalized.warnings, changedPaths: patched.changedPaths };
  }
  if (!parsed || typeof parsed !== "object" || !parsed.appSpec) throw new Error("AI planner returned an invalid response.");

  const requirements = mapCompilerProvidedRequirements(Array.isArray(parsed.requirements) ? parsed.requirements : []);
  const normalized = normalizeAppSpec({ ...parsed.appSpec, requirements });
  if (!normalized.valid) {
    const error = new Error(`AI planner produced an invalid AppSpec: ${normalized.errors.join("; ")}`);
    error.validationErrors = normalized.errors;
    throw error;
  }
  const resolution = resolveComponents(normalized.spec, registry);
  if (!normalized.spec.views.length) normalized.spec.views = inferViews(cleanPrompt, normalized.spec.entities, normalized.spec.relationships);
  const compilerIssues = [...auditCompilerSpec(normalized.spec), ...auditExplicitRequest(cleanPrompt, normalized.spec)];
  normalized.spec.selectedCapabilities = resolution.components.map((component) => component.id);
  const coverage = evaluateRequirementCoverage(normalized.spec);

  const result = {
    ready: coverage.complete && normalized.valid && !resolution.missingCapabilities.length && !compilerIssues.length,
    spec: normalized.spec,
    requirements: coverage.requirements,
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
    componentPlan: resolution.components,
    missingCapabilities: [...resolution.missingCapabilities, ...compilerIssues],
    coverage,
    warnings: normalized.warnings,
  };
  if (!result.ready && !options.complete && !options.repairAttempt) {
    return planApplication(cleanPrompt, { ...options, repairAttempt: true, validationFeedback: [...result.missingCapabilities.map(c => c.reason), ...coverage.requirements.filter(r => r.status === 'uncovered').map(r => r.text)] });
  }
  if (result.ready && (!options.complete || options.seedComplete) && /seed|sample data/i.test(cleanPrompt)) {
    const seeds = await populateSeedData(result.spec, options.seedComplete || defaultCompletion);
    result.spec.seedData = seeds.seedData;
    result.warnings.push(...seeds.warnings);
  }
  return result;
}

module.exports = { planApplication, buildPlannerMessages, classifyCapabilityTags, stripJsonFence, mapCompilerProvidedRequirements };
