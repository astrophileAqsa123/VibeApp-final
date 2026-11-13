const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { normalizeAppSpec } = require("../services/appSpec");
const { buildMultiEntityFlutterApp } = require("../services/multiEntityFlutterCompiler");
const { patchPubspec, detectExtraPackages } = require("../services/webPreviewManager");
const { sanitizeGeneratedFlutterCode } = require("../services/exact500AppTemplates/flutterCodeSafety");

const normalized = normalizeAppSpec({
  app: { name: "Compiler Validation" },
  entities: [
    { id: "team", name: "Team", fields: [{ id: "name", label: "Name", required: true }] },
    { id: "member", name: "Member", fields: [{ id: "name", label: "Name", required: true }] },
    { id: "project", name: "Project", fields: [{ id: "name", label: "Name", required: true }] },
  ],
  relationships: [
    { id: "teamMembers", type: "oneToMany", sourceEntity: "team", targetEntity: "member", targetField: "teamId", required: true, onDelete: "restrict" },
    { id: "projectMembers", type: "manyToMany", sourceEntity: "project", targetEntity: "member", onDelete: "restrict" },
  ],
});

if (!normalized.valid) throw new Error(normalized.errors.join("; "));
const { planStructuredPrompt } = require('../services/ai/structuredPromptPlanner');
const filmPlan = planStructuredPrompt(require('../test/fixtures/filmProduction'));
const compiled = buildMultiEntityFlutterApp(filmPlan.spec);
compiled.code = sanitizeGeneratedFlutterCode(compiled.code);
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "vibeapp-multi-compiler-"));
let flutter = String(process.env.FLUTTER_PATH || "flutter").replace(/^['\"]|['\"]$/g, "");
if (flutter !== "flutter" && fs.existsSync(flutter) && fs.statSync(flutter).isDirectory()) {
  const direct = path.join(flutter, process.platform === "win32" ? "flutter.bat" : "flutter");
  const nested = path.join(flutter, "bin", process.platform === "win32" ? "flutter.bat" : "flutter");
  flutter = fs.existsSync(direct) ? direct : nested;
}

try {
  const create = spawnSync(flutter, ["create", "--platforms=web", "--project-name", "vibe_multi_validation", "."], {
    cwd: workspace,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 180000,
  });
  if (create.status !== 0) throw new Error(create.error?.message || create.stderr || create.stdout || "flutter create failed");
  fs.writeFileSync(path.join(workspace, "lib", "main.dart"), compiled.code, "utf8");
  patchPubspec(workspace, detectExtraPackages(compiled.code));
  const packages = spawnSync(flutter, ["pub", "get"], {
    cwd: workspace,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 180000,
  });
  if (packages.status !== 0) throw new Error(packages.error?.message || packages.stderr || packages.stdout || "flutter pub get failed");
  const analyze = spawnSync(flutter, ["analyze", "--no-fatal-infos", "lib/main.dart"], {
    cwd: workspace,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 180000,
  });
  process.stdout.write(analyze.stdout || "");
  process.stderr.write(analyze.stderr || "");
  if (analyze.status !== 0) process.exitCode = analyze.status || 1;
  if (analyze.status === 0) {
    fs.copyFileSync(path.join(__dirname, '..', 'test', 'fixtures', 'generated_store_test.dart'), path.join(workspace, 'test', 'generated_store_test.dart'));
    const tests = spawnSync(flutter, ['test', 'test/generated_store_test.dart'], { cwd: workspace, encoding: 'utf8', shell: process.platform === 'win32', timeout: 180000 });
    process.stdout.write(tests.stdout || '');
    process.stderr.write(tests.stderr || '');
    if (tests.status !== 0) process.exitCode = tests.status || 1;
    if (tests.status === 0) {
      const build = spawnSync(flutter, ['build', 'web', '--no-wasm-dry-run'], { cwd: workspace, encoding: 'utf8', shell: process.platform === 'win32', timeout: 240000 });
      process.stdout.write(build.stdout || '');
      process.stderr.write(build.stderr || '');
      if (build.status !== 0) process.exitCode = build.status || 1;
    }
  }
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}
