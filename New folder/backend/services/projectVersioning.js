function toVersionNumber(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildProjectVersion({
  version = 1,
  prompt = "",
  source = "",
  generatedCode = "",
  storageMode = "local",
  tableSql = "",
  supabaseTable = "",
  appConfig = null,
  appSpec = null,
  requirements = [],
  componentPlan = [],
  fileManifest = [],
  entrypoint = "lib/main.dart",
  createdAt = new Date(),
} = {}) {
  return {
    version: toVersionNumber(version),
    prompt: String(prompt || ""),
    source: String(source || ""),
    generatedCode: String(generatedCode || ""),
    storageMode: storageMode === "supabase" ? "supabase" : "local",
    tableSql: String(tableSql || ""),
    supabaseTable: String(supabaseTable || ""),
    appConfig: appConfig && typeof appConfig === "object" ? appConfig : null,
    appSpec: appSpec && typeof appSpec === "object" ? appSpec : null,
    requirements: Array.isArray(requirements) ? requirements : [],
    componentPlan: Array.isArray(componentPlan) ? componentPlan : [],
    fileManifest: Array.isArray(fileManifest) ? fileManifest : [],
    entrypoint: String(entrypoint || "lib/main.dart"),
    createdAt,
  };
}

/**
 * Repairs legacy projects that did not capture their initial/current version.
 * We only snapshot code we actually have; an old version is never fabricated.
 */
function ensureCurrentVersionSnapshot(project) {
  if (!project) return false;

  const code = project.currentCode || project.generatedCode || "";
  if (!String(code).trim()) return false;

  const currentVersion = toVersionNumber(project.version);
  const versions = Array.isArray(project.versions) ? project.versions : [];
  if (versions.some((item) => toVersionNumber(item?.version) === currentVersion)) {
    return false;
  }

  versions.push(buildProjectVersion({
    version: currentVersion,
    prompt: project.latestPrompt || project.prompt || "",
    source: project.generationSource || "legacy-recovery",
    generatedCode: code,
    storageMode: project.storageMode,
    tableSql: project.tableSql,
    supabaseTable: project.supabaseTable,
    appConfig: project.appConfig,
    appSpec: project.appSpec,
    requirements: project.requirements,
    componentPlan: project.componentPlan,
    fileManifest: project.fileManifest,
    entrypoint: project.entrypoint,
    createdAt: project.updatedAt || project.createdAt || new Date(),
  }));
  versions.sort((a, b) => toVersionNumber(a.version) - toVersionNumber(b.version));
  project.versions = versions;
  return true;
}

module.exports = {
  buildProjectVersion,
  ensureCurrentVersionSnapshot,
  toVersionNumber,
};
