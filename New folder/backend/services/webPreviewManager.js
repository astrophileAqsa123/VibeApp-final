const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const WebPreviewSession = require("../models/WebPreviewSession");
const Project = require("../models/Project");
const {
  sanitizeGeneratedFlutterCode,
} = require("./exact500AppTemplates/flutterCodeSafety");
const selfHealingBuild = require("./selfHealingBuild");

const MAX_LOG_CHARS = Number(process.env.WEB_PREVIEW_MAX_LOG_CHARS || 120000);
const BUILD_CONCURRENCY = Math.max(
  1,
  Number(process.env.WEB_PREVIEW_CONCURRENCY || 2)
);
const BUILD_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.WEB_PREVIEW_BUILD_TIMEOUT_MS || 300000)
);

async function loadVerifiedFallbackCandidates(projectId, failedCode = "") {
  if (!projectId) return [];
  try {
    const project = await Project.findById(projectId)
      .select("+lastKnownGoodCode currentCode generatedCode versions version lastKnownGoodVersion")
      .lean();
    if (!project) return [];

    const candidates = [];
    const seen = new Set([String(failedCode || "")]);
    const add = (code, version, source) => {
      const value = String(code || "").trim();
      if (!value || seen.has(value) || !value.includes("void main")) return;
      seen.add(value);
      candidates.push({ code: value, version: Number(version || 0), source });
    };

    add(project.lastKnownGoodCode, project.lastKnownGoodVersion, "last-known-good");
    const versions = Array.isArray(project.versions) ? [...project.versions].reverse() : [];
    for (const item of versions) add(item?.generatedCode, item?.version, "previous-project-version");
    add(project.currentCode, project.version, "current-project-code");
    add(project.generatedCode, project.version, "generated-project-code");
    return candidates.slice(0, 4);
  } catch (error) {
    console.warn(`[web-preview] could not load fallback project versions: ${error.message || error}`);
    return [];
  }
}

async function markProjectCodeVerified(projectId, code, version = 0) {
  if (!projectId || !String(code || "").trim()) return;
  try {
    await Project.updateOne(
      { _id: projectId },
      {
        $set: {
          lastKnownGoodCode: String(code),
          lastKnownGoodVersion: Number(version || 0),
          lastKnownGoodAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.warn(`[web-preview] could not persist last-known-good code: ${error.message || error}`);
  }
}

function cleanEnvPath(value = "") {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\/g, "/");
}

function getFlutterPath() {
  const configured = cleanEnvPath(process.env.FLUTTER_PATH || "");

  // FLUTTER_PATH may be either:
  //   C:/flutter/bin/flutter.bat  (executable)
  //   C:/flutter/bin              (bin directory)
  //   C:/flutter                  (Flutter SDK root)
  // Keep the default as `flutter` so PATH-based setups continue to work.
  if (!configured) return "flutter";
  if (/^flutter(?:\.(?:bat|cmd|exe))?$/i.test(configured)) return configured;

  const lower = configured.toLowerCase();
  const isWindows = process.platform === "win32";
  const executableNames = isWindows
    ? ["flutter.bat", "flutter.cmd", "flutter.exe"]
    : ["flutter"];

  if (executableNames.some((name) => lower.endsWith(`/${name}`))) {
    return configured;
  }

  // If the configured value itself is an existing directory, resolve the
  // executable from either <dir>/flutter(.bat) or <dir>/bin/flutter(.bat).
  try {
    if (fs.existsSync(configured) && fs.statSync(configured).isDirectory()) {
      const candidates = isWindows
        ? [
            path.join(configured, "flutter.bat"),
            path.join(configured, "flutter.cmd"),
            path.join(configured, "bin", "flutter.bat"),
            path.join(configured, "bin", "flutter.cmd"),
          ]
        : [
            path.join(configured, "flutter"),
            path.join(configured, "bin", "flutter"),
          ];

      const found = candidates.find((candidate) => fs.existsSync(candidate));
      if (found) return cleanEnvPath(found);
    }
  } catch (_) {}

  // Also handle common SDK/bin strings even if existence checks are not
  // possible at startup (for example, a mounted path that appears later).
  if (isWindows) {
    if (/\/bin$/i.test(configured)) return `${configured}/flutter.bat`;
    return `${configured}/bin/flutter.bat`;
  }

  if (/\/bin$/i.test(configured)) return `${configured}/flutter`;
  return `${configured}/bin/flutter`;
}

function getWorkRoot() {
  return cleanEnvPath(
    process.env.WEB_PREVIEW_WORK_ROOT ||
      path.join(os.tmpdir(), "vibeapp", "web-previews")
  );
}

function windowsCmdInvocation(command, args = []) {
  if (process.platform !== "win32" || !/\.(bat|cmd)$/i.test(command)) {
    return { command, args, windowsVerbatimArguments: false };
  }

  // .bat/.cmd files must run through cmd.exe on Windows. `call` prevents
  // cmd /c from treating the quotes around an absolute batch-file path as
  // literal characters (for example: \"C:/flutter/bin/flutter.bat\").
  // windowsVerbatimArguments keeps Node/libuv from adding another escaping
  // layer around the already-formed cmd command line.
  const quoteForCmd = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const commandLine = `call ${quoteForCmd(command)} ${args
    .map(quoteForCmd)
    .join(" ")}`.trim();

  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
    windowsVerbatimArguments: true,
  };
}

function appendBounded(current, chunk) {
  const next = `${current || ""}${chunk || ""}`;
  if (next.length <= MAX_LOG_CHARS) return next;
  return next.slice(next.length - MAX_LOG_CHARS);
}

function detectExtraPackages(dartCode = "") {
  return {
    supabase: /import\s+['"]package:supabase_flutter\/supabase_flutter\.dart['"]\s*;/.test(
      dartCode
    ),
    sharedPreferences: /import\s+['"]package:shared_preferences\/shared_preferences\.dart['"]\s*;/.test(dartCode),
    hive: /import\s+['"]package:hive_flutter\/hive_flutter\.dart['"]\s*;/.test(dartCode),
  };
}

function patchPubspec(projectPath, extraPackages = {}) {
  const pubspecPath = path.join(projectPath, "pubspec.yaml");
  if (!fs.existsSync(pubspecPath)) return;

  let content = fs.readFileSync(pubspecPath, "utf8");
  const hasSupabase = content.includes("supabase_flutter:");
  const hasSharedPreferences = content.includes("shared_preferences:");
  const hasHive = content.includes("hive_flutter:");

  if (extraPackages.supabase && !hasSupabase) {
    const dependencyAnchor = /([ \t]*cupertino_icons:[^\n]*\n)/;
    if (dependencyAnchor.test(content)) {
      content = content.replace(
        dependencyAnchor,
        "$1  supabase_flutter: ^2.5.0\n"
      );
    } else {
      content = content.replace(
        /dependencies:\s*\n/,
        "dependencies:\n  supabase_flutter: ^2.5.0\n"
      );
    }
  }
  if (extraPackages.sharedPreferences && !hasSharedPreferences) {
    content = content.replace(
      /dependencies:\s*\n/,
      "dependencies:\n  shared_preferences: ^2.2.3\n"
    );
  }
  if (extraPackages.hive && !hasHive) content = content.replace(/^dependencies:\s*\n/m, "dependencies:\n  hive_flutter: ^1.1.0\n");
  if ((extraPackages.supabase && !hasSupabase) || (extraPackages.sharedPreferences && !hasSharedPreferences) || (extraPackages.hive && !hasHive)) {
    fs.writeFileSync(pubspecPath, content, "utf8");
  }
}

function removeDirectorySafe(directory) {
  if (!directory) return;
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch (error) {
    console.warn("Preview cleanup warning:", error.message);
  }
}

class WebPreviewManager {
  constructor() {
    this.queue = [];
    this.activeCount = 0;
    this.activeProcesses = new Map();
    this.cancelled = new Set();
    this.started = false;
    this.cleanupTimer = null;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    fs.mkdirSync(getWorkRoot(), { recursive: true });

    try {
      await WebPreviewSession.updateMany(
        { status: { $in: ["queued", "building"] } },
        {
          $set: {
            status: "failed",
            message: "Preview build was interrupted by a server restart. Please run it again.",
            completedAt: new Date(),
          },
        }
      );
    } catch (error) {
      console.warn("Preview recovery warning:", error.message);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredArtifacts().catch((error) => {
        console.warn("Preview expiry cleanup warning:", error.message);
      });
    }, 15 * 60 * 1000);

    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  async stop() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;

    for (const [sessionId, child] of this.activeProcesses.entries()) {
      this.cancelled.add(sessionId);
      this.killChild(child);
    }
    this.activeProcesses.clear();
  }

  enqueue(job) {
    this.queue.push(job);
    this.drain();
  }

  drain() {
    while (this.activeCount < BUILD_CONCURRENCY && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job || this.cancelled.has(job.sessionId)) continue;

      this.activeCount += 1;
      this.processJob(job)
        .catch((error) => {
          console.error("Web preview build error:", error);
        })
        .finally(() => {
          this.activeCount -= 1;
          this.drain();
        });
    }
  }

  async cancel(sessionId) {
    this.cancelled.add(sessionId);
    this.queue = this.queue.filter((job) => job.sessionId !== sessionId);

    const child = this.activeProcesses.get(sessionId);
    if (child) this.killChild(child);

    const session = await WebPreviewSession.findOne({ sessionId });
    if (session) {
      removeDirectorySafe(session.workspacePath);
      session.status = "cancelled";
      session.progress = 100;
      session.message = "Preview stopped.";
      session.completedAt = new Date();
      session.artifactPath = "";
      session.previewUrl = "";
      await session.save();
    }
  }

  killChild(child) {
    if (!child || child.killed) return;
    try {
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], {
          windowsHide: true,
        });
      } else {
        child.kill("SIGTERM");
      }
    } catch (_) {}
  }

  async setStatus(sessionId, fields) {
    try {
      await WebPreviewSession.updateOne({ sessionId }, { $set: fields });
    } catch (error) {
      console.warn(`Preview status update failed (${sessionId}):`, error.message);
    }
  }

  async runCommand(sessionId, command, args, options = {}) {
    return new Promise((resolve, reject) => {
      let output = "";
      let settled = false;
      let timer = null;

      const invocation = windowsCmdInvocation(command, args);
      const child = spawn(invocation.command, invocation.args, {
        cwd: options.cwd,
        env: process.env,
        shell: false,
        windowsHide: true,
        windowsVerbatimArguments: invocation.windowsVerbatimArguments === true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.activeProcesses.set(sessionId, child);

      const finish = (error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (this.activeProcesses.get(sessionId) === child) {
          this.activeProcesses.delete(sessionId);
        }
        if (error) reject(error);
        else resolve(output);
      };

      const capture = (data) => {
        const text = data.toString();
        output = appendBounded(output, text);
      };

      child.stdout.on("data", capture);
      child.stderr.on("data", capture);

      child.on("error", (error) => {
        finish(new Error(`${error.message}\nCommand: ${command} ${args.join(" ")}`));
      });

      child.on("close", (code, signal) => {
        if (this.cancelled.has(sessionId)) {
          return finish(new Error("Preview build cancelled."));
        }
        if (code === 0) return finish();
        finish(
          new Error(
            `Command failed with code ${code}${signal ? ` (${signal})` : ""}.\n${output}`
          )
        );
      });

      timer = setTimeout(() => {
        this.killChild(child);
        finish(
          new Error(
            `Preview build timed out after ${Math.round(BUILD_TIMEOUT_MS / 1000)} seconds.\n${output}`
          )
        );
      }, options.timeoutMs || BUILD_TIMEOUT_MS);
    });
  }

  async processJob(job) {
    const { sessionId, publicToken, rawCode, projectId = null } = job;
    const workspacePath = path.join(getWorkRoot(), sessionId);
    const artifactPath = path.join(workspacePath, "build", "web");
    let logs = "";

    if (this.cancelled.has(sessionId)) return;

    try {
      removeDirectorySafe(workspacePath);
      fs.mkdirSync(workspacePath, { recursive: true });

      await this.setStatus(sessionId, {
        status: "building",
        progress: 10,
        message: "Creating isolated Flutter workspace…",
        workspacePath,
        startedAt: new Date(),
      });

      logs = appendBounded(
        logs,
        await this.runCommand(
          sessionId,
          getFlutterPath(),
          [
            "create",
            "--platforms=web",
            "--project-name",
            `vibe_preview_${sessionId.replace(/-/g, "_")}`,
            ".",
          ],
          { cwd: workspacePath }
        )
      );

      if (this.cancelled.has(sessionId)) return;

      let currentCode = sanitizeGeneratedFlutterCode(rawCode || "");
      fs.mkdirSync(path.join(workspacePath, "lib"), { recursive: true });

      const baseHref = `/previews/${publicToken}/`;
      let buildSucceeded = false;
      let terminalBuildError = null;
      let recoveryStrategy = "generated-or-repaired";
      let servedFallbackVersion = 0;
      const maxRepairs = selfHealingBuild.MAX_REPAIR_ATTEMPTS;

      for (let attempt = 0; attempt <= maxRepairs; attempt += 1) {
        fs.writeFileSync(
          path.join(workspacePath, "lib", "main.dart"),
          currentCode,
          "utf8"
        );
        patchPubspec(workspacePath, detectExtraPackages(currentCode));

        await this.setStatus(sessionId, {
          progress: attempt === 0 ? 30 : Math.min(85, 58 + attempt * 8),
          message: attempt === 0
            ? "Resolving Flutter dependencies…"
            : `AI Build Guardian: verifying preview repair ${attempt}/${maxRepairs}…`,
        });

        logs = appendBounded(
          logs,
          await this.runCommand(sessionId, getFlutterPath(), ["pub", "get"], {
            cwd: workspacePath,
          })
        );

        if (this.cancelled.has(sessionId)) return;

        await this.setStatus(sessionId, {
          progress: attempt === 0 ? 55 : Math.min(92, 65 + attempt * 8),
          message: attempt === 0
            ? "Building Flutter Web preview…"
            : "Rebuilding Flutter Web preview after automatic repair…",
        });

        try {
          logs = appendBounded(
            logs,
            await this.runCommand(
              sessionId,
              getFlutterPath(),
              ["build", "web", "--release", `--base-href=${baseHref}`],
              { cwd: workspacePath }
            )
          );
          buildSucceeded = true;
          break;
        } catch (buildError) {
          const buildLog = String(buildError?.message || buildError);
          logs = appendBounded(logs, `\n[preview-build-attempt-${attempt + 1}]\n${buildLog}\n`);

          if (attempt >= maxRepairs) {
            terminalBuildError = buildError;
            break;
          }

          await this.setStatus(sessionId, {
            progress: Math.min(88, 60 + attempt * 8),
            message: "Preview build issue detected. AI Build Guardian is repairing it…",
            buildLogs: logs,
          });

          const repair = await selfHealingBuild.repairCode({
            code: currentCode,
            buildLog,
            attempt: attempt + 1,
            originalPrompt: "",
          });

          logs = appendBounded(
            logs,
            `\n[preview-repair-${attempt + 1}] strategy=${repair.strategy}; categories=${repair.categories.map((item) => item.type).join(",")}; ${repair.summary}\n`
          );

          if (!repair.changed) {
            terminalBuildError = new Error(`${buildLog}\nPreview self-healing could not apply a safe repair: ${repair.summary}`);
            break;
          }

          currentCode = sanitizeGeneratedFlutterCode(repair.updatedCode);
        }
      }

      // Production safety net: never discard a previously working project preview.
      // If the new code still fails after deterministic + Groq repair, try the
      // project's last verified / previous versions and publish the first one
      // that actually passes a fresh Flutter Web build.
      if (!buildSucceeded && projectId) {
        const fallbackCandidates = await loadVerifiedFallbackCandidates(projectId, rawCode);
        for (const candidate of fallbackCandidates) {
          if (this.cancelled.has(sessionId)) return;
          try {
            const compatibility = selfHealingBuild.deterministicRepair(candidate.code, String(terminalBuildError?.message || ""));
            const fallbackCode = sanitizeGeneratedFlutterCode(compatibility.updatedCode || candidate.code);
            fs.writeFileSync(path.join(workspacePath, "lib", "main.dart"), fallbackCode, "utf8");
            patchPubspec(workspacePath, detectExtraPackages(fallbackCode));

            await this.setStatus(sessionId, {
              progress: 93,
              message: "New version could not be verified. Restoring the last working project version…",
              buildLogs: logs,
            });
            logs = appendBounded(logs, await this.runCommand(sessionId, getFlutterPath(), ["pub", "get"], { cwd: workspacePath }));
            logs = appendBounded(logs, await this.runCommand(
              sessionId,
              getFlutterPath(),
              ["build", "web", "--release", `--base-href=${baseHref}`],
              { cwd: workspacePath }
            ));

            currentCode = fallbackCode;
            buildSucceeded = true;
            recoveryStrategy = candidate.source;
            servedFallbackVersion = candidate.version;
            logs = appendBounded(logs, `\n[guardian] recovered preview using ${candidate.source} version ${candidate.version || "unknown"}.\n`);
            break;
          } catch (fallbackError) {
            logs = appendBounded(logs, `\n[guardian-fallback] ${candidate.source} version ${candidate.version || "unknown"} failed verification: ${fallbackError.message || fallbackError}\n`);
          }
        }
      }

      if (!buildSucceeded) {
        throw terminalBuildError || new Error("Flutter Web preview could not be verified after automatic repair and project rollback attempts.");
      }

      if (this.cancelled.has(sessionId)) return;

      const indexPath = path.join(artifactPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        throw new Error("Flutter build finished but build/web/index.html was not created.");
      }

      await markProjectCodeVerified(projectId, currentCode, servedFallbackVersion);

      await this.setStatus(sessionId, {
        status: "ready",
        progress: 100,
        message: recoveryStrategy === "generated-or-repaired"
          ? "Preview ready."
          : "The latest update could not be verified, so VibeApp restored a previously working version automatically.",
        artifactPath,
        previewUrl: `/previews/${publicToken}/`,
        buildLogs: logs,
        recovered: recoveryStrategy !== "generated-or-repaired",
        recoveryStrategy,
        servedFallbackVersion,
        completedAt: new Date(),
      });
    } catch (error) {
      if (this.cancelled.has(sessionId)) return;

      const errorText = error?.message || "Unknown preview build error.";
      logs = appendBounded(logs, `\n${errorText}`);
      console.error(`[web-preview:${sessionId}] build failed:`, errorText);

      await this.setStatus(sessionId, {
        status: "failed",
        progress: 100,
        message: "Preview build failed. Check the generated code or build logs.",
        buildLogs: logs,
        completedAt: new Date(),
      });
    }
  }

  async cleanupExpiredArtifacts() {
    const now = new Date();
    const sessions = await WebPreviewSession.find({
      expiresAt: { $lte: now },
      workspacePath: { $ne: "" },
    })
      .select("sessionId workspacePath")
      .lean();

    for (const session of sessions) {
      removeDirectorySafe(session.workspacePath);
      this.cancelled.add(session.sessionId);
    }

    if (sessions.length) {
      await WebPreviewSession.updateMany(
        { sessionId: { $in: sessions.map((item) => item.sessionId) } },
        {
          $set: {
            status: "expired",
            artifactPath: "",
            previewUrl: "",
            message: "Preview expired.",
          },
        }
      );
    }
  }
}

module.exports = new WebPreviewManager();
module.exports.detectExtraPackages = detectExtraPackages;
module.exports.patchPubspec = patchPubspec;
