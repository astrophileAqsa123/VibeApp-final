const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ApkBuildJob = require("../models/ApkBuildJob");
const Project = require("../models/Project");
const selfHealingBuild = require("./selfHealingBuild");
const { sanitizeGeneratedFlutterCode } = require("./exact500AppTemplates/flutterCodeSafety");
const { packageNameForProject, androidIdentityPatchPython } = require("../utils/apkIdentity");

const CONCURRENCY = Math.max(1, Number(process.env.APK_BUILD_CONCURRENCY || 1));
const BUILD_TIMEOUT_MS = Math.max(60_000, Number(process.env.APK_BUILD_TIMEOUT_MS || 900_000));
const TTL_HOURS = Math.max(1, Number(process.env.APK_ARTIFACT_TTL_HOURS || 72));
const MAX_LOG_CHARS = Math.max(10_000, Number(process.env.APK_MAX_LOG_CHARS || 160_000));
const APK_BUILDER_VERSION = "qr-install-v4-main-only-analyze";
const DOWNLOAD_TOKEN_TTL_MINUTES = Math.max(
  5,
  Number(process.env.APK_DOWNLOAD_TOKEN_TTL_MINUTES || 60)
);

const APK_FLUTTER_PATH_WSL = process.env.APK_FLUTTER_PATH_WSL || "";
const WEB_FLUTTER_PATH = process.env.FLUTTER_PATH || "";
const FLUTTER =
  APK_FLUTTER_PATH_WSL ||
  (/^[A-Za-z]:[\\/]/.test(WEB_FLUTTER_PATH)
    ? "/home/zainab1/flutter/bin/flutter"
    : WEB_FLUTTER_PATH) ||
  "/home/zainab1/flutter/bin/flutter";
const ANDROID_SDK = process.env.ANDROID_SDK_PATH || "/home/zainab1/android-sdk";
const JAVA_HOME = process.env.JAVA_HOME_WSL || "/usr/lib/jvm/java-17-openjdk-amd64";
const APK_BUILD_ROOT = process.env.APK_BUILD_PROJECT_PATH || "/tmp/vibeapp-apk-builds";
const APK_ARTIFACT_DIR = path.resolve(
  process.env.APK_ARTIFACT_DIR || path.join(__dirname, "..", "storage", "apks")
);

const SIGNING = {
  keystore: process.env.APK_SIGNING_KEYSTORE_WSL || "",
  storePassword: process.env.APK_SIGNING_STORE_PASSWORD || "",
  keyAlias: process.env.APK_SIGNING_KEY_ALIAS || "",
  keyPassword: process.env.APK_SIGNING_KEY_PASSWORD || "",
};
const REQUIRE_RELEASE_SIGNING =
  String(process.env.APK_REQUIRE_RELEASE_SIGNING || "false").toLowerCase() === "true";

let activeCount = 0;
let started = false;
let draining = false;

async function loadProjectFallbackCandidates(projectId, failedCode = "") {
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
    for (const item of (Array.isArray(project.versions) ? [...project.versions].reverse() : [])) {
      add(item?.generatedCode, item?.version, "previous-project-version");
    }
    add(project.currentCode, project.version, "current-project-code");
    add(project.generatedCode, project.version, "generated-project-code");
    return candidates.slice(0, 3);
  } catch (error) {
    console.warn(`[apk] could not load fallback project versions: ${error.message || error}`);
    return [];
  }
}

async function markProjectCodeVerified(projectId, code, version = 0) {
  if (!projectId || !String(code || "").trim()) return;
  try {
    await Project.updateOne({ _id: projectId }, {
      $set: {
        lastKnownGoodCode: String(code),
        lastKnownGoodVersion: Number(version || 0),
        lastKnownGoodAt: new Date(),
      },
    });
  } catch (error) {
    console.warn(`[apk] could not persist last-known-good code: ${error.message || error}`);
  }
}

function hasCustomReleaseSigning() {
  return Boolean(
    SIGNING.keystore &&
      SIGNING.storePassword &&
      SIGNING.keyAlias &&
      SIGNING.keyPassword
  );
}

function windowsPathToWsl(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`);
}

function normalizeForWsl(value) {
  const text = String(value || "");
  return /^[A-Za-z]:[\\/]/.test(text)
    ? windowsPathToWsl(text)
    : text.replace(/\\/g, "/");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function ensureArtifactDir() {
  fs.mkdirSync(APK_ARTIFACT_DIR, { recursive: true });
  return APK_ARTIFACT_DIR;
}

function cleanCode(code) {
  let clean = String(code || "")
    .replace(/^```dart\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .replace(/^\s*import\s+['"]dart:html['"](?:\s+as\s+\w+)?\s*;\s*$/gm, "")
    .trim();

  clean = clean
    .replace(/ElevatedButton\.styleFrom\(\s*primary:/g, "ElevatedButton.styleFrom(backgroundColor:")
    .replace(/TextButton\.styleFrom\(\s*primary:/g, "TextButton.styleFrom(foregroundColor:")
    .replace(/OutlinedButton\.styleFrom\(\s*primary:/g, "OutlinedButton.styleFrom(foregroundColor:")
    .replace(/styleFrom\(\s*primary:/g, "styleFrom(backgroundColor:")
    .replace(/\bonPrimary:/g, "foregroundColor:")
    .replace(/\bonSurface:/g, "foregroundColor:")
    .replace(/\bprimaryVariant:/g, "primaryContainer:")
    .replace(/\bsecondaryVariant:/g, "secondaryContainer:")
    .replace(/\baccentColor:/g, "secondary:")
    .replace(/\bbackground:/g, "surface:");

  if (!clean.includes("package:flutter/material.dart")) {
    clean = `import 'package:flutter/material.dart';\n\n${clean}`;
  }

  if (!clean.includes("void main()")) {
    clean = `${clean}\n\nvoid main() {\n  runApp(const MyApp());\n}\n`;
  }

  return clean;
}

function detectPackages(code) {
  const packageMap = {
    "package:intl/": "intl: ^0.18.0",
    "package:http/": "http: ^1.1.0",
    "package:provider/": "provider: ^6.1.1",
    "package:shared_preferences/": "shared_preferences: ^2.2.2",
    "package:hive_flutter/": "hive_flutter: ^1.1.0",
    "package:dio/": "dio: ^5.3.3",
    "package:get/": "get: ^4.6.6",
    "package:flutter_bloc/": "flutter_bloc: ^8.1.3",
    "package:bloc/": "bloc: ^8.1.2",
    "package:rxdart/": "rxdart: ^0.27.7",
    "package:cached_network_image/": "cached_network_image: ^3.3.0",
    "package:flutter_svg/": "flutter_svg: ^2.0.9",
    "package:lottie/": "lottie: ^2.7.0",
    "package:google_fonts/": "google_fonts: ^6.1.0",
    "package:font_awesome_flutter/": "font_awesome_flutter: ^10.6.0",
    "package:animations/": "animations: ^2.0.8",
    "package:fl_chart/": "fl_chart: ^0.65.0",
    "package:sqflite/": "sqflite: ^2.3.0",
    "package:path/": "path: ^1.8.3",
    "package:url_launcher/": "url_launcher: ^6.2.1",
    "package:permission_handler/": "permission_handler: ^11.0.1",
    "package:geolocator/": "geolocator: ^10.1.0",
    "package:connectivity_plus/": "connectivity_plus: ^5.0.2",
    "package:path_provider/": "path_provider: ^2.1.1",
    "package:uuid/": "uuid: ^4.2.1",
    "package:crypto/": "crypto: ^3.0.3",
    "package:supabase_flutter/": "supabase_flutter: ^2.5.0",
  };

  return Object.entries(packageMap)
    .filter(([key]) => code.includes(key))
    .map(([, value]) => value);
}

function buildPubspec(packages) {
  return `name: vibeapp_apk_build\ndescription: VibeApp generated APK build\npublish_to: 'none'\nversion: 1.0.0+1\n\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\n\ndependencies:\n  flutter:\n    sdk: flutter\n${packages
    .map((pkg) => `  ${pkg}`)
    .join("\n")}\n\nflutter:\n  uses-material-design: true\n`;
}

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(`${APK_BUILDER_VERSION}\n${cleanCode(code)}`)
    .digest("hex");
}

function hashDownloadToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function appendLog(current, text) {
  const next = `${current || ""}${text || ""}`;
  return next.length <= MAX_LOG_CHARS
    ? next
    : next.slice(next.length - MAX_LOG_CHARS);
}

function runWslScript(script, timeoutMs = BUILD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, "..", "storage", "scripts");
    fs.mkdirSync(tempDir, { recursive: true });
    const scriptPath = path.join(
      tempDir,
      `apk-script-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.sh`
    );
    fs.writeFileSync(scriptPath, script, { encoding: "utf8", mode: 0o700 });
    const wslScriptPath = windowsPathToWsl(scriptPath);
    const safeScriptPath = wslScriptPath.replace(/"/g, '\\"');

    // On Windows the script runs through WSL; on a Linux server (EC2, DigitalOcean) run it directly.
    const shellCommand =
      process.platform === "win32"
        ? `wsl bash "${safeScriptPath}"`
        : `bash "${safeScriptPath}"`;

    exec(
      shellCommand,
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 80 },
      (err, stdout, stderr) => {
        try {
          fs.unlinkSync(scriptPath);
        } catch (_) {}
        if (err) {
          const error = new Error(stderr || stdout || err.message || "APK build failed");
          error.stdout = stdout || "";
          error.stderr = stderr || "";
          return reject(error);
        }
        resolve({ stdout: stdout || "", stderr: stderr || "" });
      }
    );
  });
}

async function updateJob(jobId, patch) {
  return ApkBuildJob.findOneAndUpdate({ jobId }, patch, { returnDocument: "after" });
}

function signingPatchPython() {
  return String.raw`python3 - <<'PY'
from pathlib import Path

android_dir = Path("android")
key_file = android_dir / "key.properties"

kts = android_dir / "app" / "build.gradle.kts"
groovy = android_dir / "app" / "build.gradle"

if kts.exists():
    text = kts.read_text()
    marker = "// VIBEAPP_RELEASE_SIGNING"
    if marker not in text:
        imports = "import java.util.Properties\nimport java.io.FileInputStream\n\n"
        if not text.startswith("import java.util.Properties"):
            text = imports + text

        prelude = '''\n// VIBEAPP_RELEASE_SIGNING\nval vibeappKeystoreProperties = Properties()\nval vibeappKeystoreFile = rootProject.file("key.properties")\nif (vibeappKeystoreFile.exists()) {\n    vibeappKeystoreProperties.load(FileInputStream(vibeappKeystoreFile))\n}\n\n'''
        text = text.replace("android {", prelude + "android {", 1)

        signing = '''\n    signingConfigs {\n        create("vibeappRelease") {\n            keyAlias = vibeappKeystoreProperties["keyAlias"] as String\n            keyPassword = vibeappKeystoreProperties["keyPassword"] as String\n            storeFile = vibeappKeystoreProperties["storeFile"]?.let { file(it) }\n            storePassword = vibeappKeystoreProperties["storePassword"] as String\n        }\n    }\n\n'''
        text = text.replace("    buildTypes {", signing + "    buildTypes {", 1)
        text = text.replace(
            'signingConfig = signingConfigs.getByName("debug")',
            'signingConfig = signingConfigs.getByName("vibeappRelease")'
        )
        kts.write_text(text)
elif groovy.exists():
    text = groovy.read_text()
    marker = "// VIBEAPP_RELEASE_SIGNING"
    if marker not in text:
        prelude = '''\n// VIBEAPP_RELEASE_SIGNING\ndef vibeappKeystoreProperties = new Properties()\ndef vibeappKeystoreFile = rootProject.file('key.properties')\nif (vibeappKeystoreFile.exists()) {\n    vibeappKeystoreProperties.load(new FileInputStream(vibeappKeystoreFile))\n}\n\n'''
        text = text.replace("android {", prelude + "android {", 1)
        signing = '''\n    signingConfigs {\n        vibeappRelease {\n            keyAlias vibeappKeystoreProperties['keyAlias']\n            keyPassword vibeappKeystoreProperties['keyPassword']\n            storeFile vibeappKeystoreProperties['storeFile'] ? file(vibeappKeystoreProperties['storeFile']) : null\n            storePassword vibeappKeystoreProperties['storePassword']\n        }\n    }\n\n'''
        text = text.replace("    buildTypes {", signing + "    buildTypes {", 1)
        text = text.replace("signingConfig signingConfigs.debug", "signingConfig signingConfigs.vibeappRelease")
        text = text.replace("signingConfig = signingConfigs.debug", "signingConfig = signingConfigs.vibeappRelease")
        groovy.write_text(text)
else:
    raise SystemExit("Could not find Android app Gradle build file")
PY`;
}

async function runFlutterBuildAttempt({
  code,
  workspaceWsl,
  artifactWsl,
  flutterWsl,
  androidWsl,
  javaWsl,
  signingScript,
  packageName,
}) {
  const packages = detectPackages(code);
  const pubspec = buildPubspec(packages);
  const pubspecHash = crypto.createHash("sha256").update(pubspec).digest("hex");
  const codeB64 = Buffer.from(code).toString("base64");
  const pubspecB64 = Buffer.from(pubspec).toString("base64");

  const script = `#!/bin/bash\nset -euo pipefail\n\nFLUTTER_BIN=${shellQuote(
    flutterWsl
  )}\nANDROID_SDK_DIR=${shellQuote(androidWsl)}\nJAVA_HOME_DIR=${shellQuote(
    javaWsl
  )}\nWORKSPACE=${shellQuote(workspaceWsl)}\nARTIFACT=${shellQuote(
    artifactWsl
  )}\nPUBSPEC_HASH=${shellQuote(pubspecHash)}\n\nexport ANDROID_HOME="$ANDROID_SDK_DIR"\nexport ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"\nexport JAVA_HOME="$JAVA_HOME_DIR"\nexport PATH="$(dirname "$FLUTTER_BIN"):$ANDROID_SDK_DIR/platform-tools:$ANDROID_SDK_DIR/emulator:$PATH"\n\nif [ ! -f "$WORKSPACE/pubspec.yaml" ]; then\n  rm -rf "$WORKSPACE"\n  mkdir -p "$(dirname "$WORKSPACE")"\n  "$FLUTTER_BIN" create "$WORKSPACE" --platforms android --project-name vibeapp_apk_build\nfi\n\ncd "$WORKSPACE"\n${androidIdentityPatchPython(packageName)}\n\necho '${codeB64}' | base64 -d > "$WORKSPACE/lib/main.dart"\necho '${pubspecB64}' | base64 -d > "$WORKSPACE/pubspec.yaml"\n\ncd "$WORKSPACE"\n\nOLD_HASH=""\nif [ -f .vibeapp_pubspec_hash ]; then OLD_HASH="$(cat .vibeapp_pubspec_hash)"; fi\nif [ "$OLD_HASH" != "$PUBSPEC_HASH" ] || [ ! -f pubspec.lock ]; then\n  echo "[vibeapp] resolving dependencies"\n  "$FLUTTER_BIN" pub get\n  printf '%s' "$PUBSPEC_HASH" > .vibeapp_pubspec_hash\nelse\n  echo "[vibeapp] dependencies unchanged; skipping flutter pub get"\nfi\n${signingScript}\n\necho "[vibeapp] formatting generated Dart"\n"$(dirname "$FLUTTER_BIN")/dart" format "$WORKSPACE/lib/main.dart" >/dev/null\n\necho "[vibeapp] running flutter analyze for generated lib/main.dart only"\n# Ignore Flutter create's default test/widget_test.dart; APK builds do not compile it.\nset +e\nANALYZE_OUTPUT=$("$FLUTTER_BIN" analyze --no-fatal-infos --no-fatal-warnings lib/main.dart 2>&1)\nANALYZE_STATUS=$?\nset -e\nprintf '%s\\n' "$ANALYZE_OUTPUT"\nif [ "$ANALYZE_STATUS" -ne 0 ]; then\n  if printf '%s\\n' "$ANALYZE_OUTPUT" | grep -Eiq '^[[:space:]]*error[[:space:]]*[•:-]|^ERROR\\|'; then\n    echo "[vibeapp] analyzer found compile errors" >&2\n    exit "$ANALYZE_STATUS"\n  fi\n  echo "[vibeapp] analyzer returned non-zero for warnings/info only; continuing to the real APK compile"\nfi\n\necho "[vibeapp] building release APK"\n"$FLUTTER_BIN" build apk --release\n\nmkdir -p "$(dirname "$ARTIFACT")"\ncp "$WORKSPACE/build/app/outputs/flutter-apk/app-release.apk" "$ARTIFACT"\nrm -f "$WORKSPACE/android/key.properties"\n`;

  return runWslScript(script, BUILD_TIMEOUT_MS);
}

async function processJob(job) {
  const fullJob = await ApkBuildJob.findOne({ jobId: job.jobId }).select("+code");
  if (!fullJob || fullJob.status !== "building") return;

  const customSigning = hasCustomReleaseSigning();
  if (REQUIRE_RELEASE_SIGNING && !customSigning) {
    await updateJob(fullJob.jobId, {
      status: "failed",
      progress: 100,
      message:
        "Release signing is required, but APK signing environment variables are not configured.",
      buildLogs:
        "Configure APK_SIGNING_KEYSTORE_WSL, APK_SIGNING_STORE_PASSWORD, APK_SIGNING_KEY_ALIAS, and APK_SIGNING_KEY_PASSWORD.",
      completedAt: new Date(),
    });
    return;
  }

  const safeUserId = String(fullJob.user).replace(/[^a-zA-Z0-9_-]/g, "");
  const safeProjectId = fullJob.project
    ? String(fullJob.project).replace(/[^a-zA-Z0-9_-]/g, "")
    : "new";
  const shortHash = fullJob.codeHash.slice(0, 16);
  const packageName = packageNameForProject(fullJob.project, fullJob.user, fullJob.codeHash);
  const workspaceNative = path.join(APK_BUILD_ROOT, safeUserId, safeProjectId, shortHash);
  const workspaceWsl = normalizeForWsl(workspaceNative);

  const artifactDir = ensureArtifactDir();
  const artifactId = crypto.randomBytes(12).toString("hex");
  const apkFileName = `vibeapp-${safeProjectId.slice(-8)}-${shortHash}-${artifactId}.apk`;
  const artifactNative = path.join(artifactDir, apkFileName);
  const artifactWsl = normalizeForWsl(artifactNative);

  let currentCode = cleanCode(sanitizeGeneratedFlutterCode(fullJob.code));
  let aggregateLogs = fullJob.buildLogs || "";
  const repairAttempts = Array.isArray(fullJob.repairAttempts) ? [...fullJob.repairAttempts] : [];

  await updateJob(fullJob.jobId, {
    progress: 8,
    message: "AI Build Guardian is preparing an isolated Android release workspace…",
    workspacePath: workspaceNative,
    packageName,
    signingMode: customSigning ? "custom-release" : "development-fallback",
    verificationStages: { analyze: "pending", apkBuild: "pending" },
  });

  const flutterWsl = normalizeForWsl(FLUTTER);
  const androidWsl = normalizeForWsl(ANDROID_SDK);
  const javaWsl = normalizeForWsl(JAVA_HOME);
  const keystoreWsl = normalizeForWsl(SIGNING.keystore);

  const signingScript = customSigning
    ? `\nKEYSTORE_FILE=${shellQuote(keystoreWsl)}\nSTORE_PASSWORD=${shellQuote(
        SIGNING.storePassword
      )}\nKEY_ALIAS=${shellQuote(SIGNING.keyAlias)}\nKEY_PASSWORD=${shellQuote(
        SIGNING.keyPassword
      )}\n\nif [ ! -f "$KEYSTORE_FILE" ]; then\n  echo "Configured APK signing keystore does not exist: $KEYSTORE_FILE" >&2\n  exit 18\nfi\n\ncat > "$WORKSPACE/android/key.properties" <<EOF_KEY\nstorePassword=$STORE_PASSWORD\nkeyPassword=$KEY_PASSWORD\nkeyAlias=$KEY_ALIAS\nstoreFile=$KEYSTORE_FILE\nEOF_KEY\nchmod 600 "$WORKSPACE/android/key.properties"\n\ncd "$WORKSPACE"\n${signingPatchPython()}\n`
    : "";

  const totalAttempts = selfHealingBuild.MAX_REPAIR_ATTEMPTS + 1;
  for (let buildAttempt = 1; buildAttempt <= totalAttempts; buildAttempt += 1) {
    try {
      const progress = Math.min(88, 20 + (buildAttempt - 1) * 20);
      await updateJob(fullJob.jobId, {
        progress,
        message:
          buildAttempt === 1
            ? "AI Build Guardian: analyzing and building generated app…"
            : `AI Build Guardian: verifying repair ${buildAttempt - 1}/${selfHealingBuild.MAX_REPAIR_ATTEMPTS}…`,
        repairCount: repairAttempts.length,
        repairAttempts,
      });

      const { stdout, stderr } = await runFlutterBuildAttempt({
        code: currentCode,
        workspaceWsl,
        artifactWsl,
        flutterWsl,
        androidWsl,
        javaWsl,
        signingScript,
        packageName,
      });
      aggregateLogs = appendLog(aggregateLogs, `\n\n=== BUILD ATTEMPT ${buildAttempt}: PASSED ===\n${stdout}\n${stderr}`);

      if (!fs.existsSync(artifactNative)) {
        throw new Error("Flutter finished without producing the expected release APK artifact.");
      }

      await updateJob(fullJob.jobId, {
        status: "ready",
        progress: 100,
        message: repairAttempts.length
          ? `Verified APK ready after ${repairAttempts.length} automatic repair${repairAttempts.length === 1 ? "" : "s"}.`
          : customSigning
            ? "Verified signed release APK ready."
            : "Verified release APK ready with development signing. Configure a release keystore before public distribution.",
        signingMode: customSigning ? "custom-release" : "development-fallback",
        artifactPath: artifactNative,
        artifactFileName: apkFileName,
        packageName,
        buildLogs: aggregateLogs,
        repairCount: repairAttempts.length,
        repairAttempts,
        verificationStages: { analyze: "passed", apkBuild: "passed" },
        completedAt: new Date(),
      });

      await markProjectCodeVerified(fullJob.project, currentCode, 0);
      await ApkBuildJob.updateOne(
        { jobId: fullJob.jobId },
        { $unset: { code: 1, downloadTokenHash: 1, downloadTokenExpiresAt: 1 } }
      );
      return;
    } catch (error) {
      const details = `${error.stdout || ""}\n${error.stderr || ""}\n${error.message || error}`;
      aggregateLogs = appendLog(aggregateLogs, `\n\n=== BUILD ATTEMPT ${buildAttempt}: FAILED ===\n${details}`);
      console.error(`[apk:${fullJob.jobId}] build attempt ${buildAttempt} failed:`, error.message || error);

      if (buildAttempt >= totalAttempts) break;

      const repair = await selfHealingBuild.repairCode({
        code: currentCode,
        buildLog: details,
        attempt: buildAttempt,
      });
      const record = {
        attempt: buildAttempt,
        strategy: repair.strategy,
        categories: repair.categories.map((item) => item.type),
        summary: repair.summary,
        changed: repair.changed,
        at: new Date(),
      };
      repairAttempts.push(record);
      aggregateLogs = appendLog(
        aggregateLogs,
        `\n[guardian] ${record.strategy}: ${record.summary}\n[guardian] categories: ${record.categories.join(", ")}`
      );

      await updateJob(fullJob.jobId, {
        progress: Math.min(90, 32 + repairAttempts.length * 18),
        message: repair.changed
          ? `Build issue detected (${record.categories.join(", ")}). Automatic repair applied; rebuilding…`
          : `Build issue detected (${record.categories.join(", ")}). No safe code repair was available.`,
        buildLogs: aggregateLogs,
        repairCount: repairAttempts.length,
        repairAttempts,
        verificationStages: { analyze: "failed", apkBuild: "failed" },
      });

      if (!repair.changed) break;
      currentCode = cleanCode(sanitizeGeneratedFlutterCode(repair.updatedCode));
    }
  }

  // Final production fallback: if a new project version cannot produce a
  // verified APK, try previously saved project versions. A fallback APK is
  // only published after flutter analyze + release build both pass again.
  if (fullJob.project) {
    const fallbackCandidates = await loadProjectFallbackCandidates(fullJob.project, fullJob.code);
    for (const candidate of fallbackCandidates) {
      try {
        const compatibility = selfHealingBuild.deterministicRepair(candidate.code, aggregateLogs);
        const fallbackCode = cleanCode(sanitizeGeneratedFlutterCode(compatibility.updatedCode || candidate.code));
        aggregateLogs = appendLog(aggregateLogs, `\n\n=== FALLBACK VERIFY: ${candidate.source} v${candidate.version || "?"} ===`);
        await updateJob(fullJob.jobId, {
          progress: 94,
          message: "Latest version could not be verified. VibeApp is restoring a previous working version…",
          buildLogs: aggregateLogs,
        });
        const { stdout, stderr } = await runFlutterBuildAttempt({
          code: fallbackCode,
          workspaceWsl,
          artifactWsl,
          flutterWsl,
          androidWsl,
          javaWsl,
          signingScript,
          packageName,
        });
        aggregateLogs = appendLog(aggregateLogs, `\n${stdout}\n${stderr}\n[guardian] fallback version verified successfully.`);
        if (!fs.existsSync(artifactNative)) throw new Error("Fallback build did not produce the APK artifact.");

        await markProjectCodeVerified(fullJob.project, fallbackCode, candidate.version);
        await updateJob(fullJob.jobId, {
          status: "ready",
          progress: 100,
          message: "The latest update could not be verified, so VibeApp built the last working project version instead.",
          artifactPath: artifactNative,
          artifactFileName: apkFileName,
          packageName,
          buildLogs: aggregateLogs,
          recovered: true,
          recoveryStrategy: candidate.source,
          servedFallbackVersion: candidate.version,
          repairCount: repairAttempts.length,
          repairAttempts,
          verificationStages: { analyze: "passed", apkBuild: "passed" },
          completedAt: new Date(),
        });
        await ApkBuildJob.updateOne(
          { jobId: fullJob.jobId },
          { $unset: { code: 1, downloadTokenHash: 1, downloadTokenExpiresAt: 1 } }
        );
        return;
      } catch (fallbackError) {
        aggregateLogs = appendLog(aggregateLogs, `\n[guardian] fallback ${candidate.source} failed: ${fallbackError.message || fallbackError}`);
      }
    }
  }

  await updateJob(fullJob.jobId, {
    status: "failed",
    progress: 100,
    message: repairAttempts.length
      ? `Build failed after ${repairAttempts.length} self-healing repair attempt${repairAttempts.length === 1 ? "" : "s"}. Open the repair report and build logs.`
      : "APK build failed. AI Build Guardian could not apply a safe repair; open build logs for details.",
    buildLogs: aggregateLogs,
    repairCount: repairAttempts.length,
    repairAttempts,
    verificationStages: { analyze: "failed", apkBuild: "failed" },
    completedAt: new Date(),
  });
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    while (activeCount < CONCURRENCY) {
      const job = await ApkBuildJob.findOneAndUpdate(
        { status: "queued", expiresAt: { $gt: new Date() } },
        {
          $set: {
            status: "building",
            progress: 5,
            message: "APK build worker started.",
            startedAt: new Date(),
          },
        },
        { sort: { createdAt: 1 }, returnDocument: "after" }
      );
      if (!job) break;

      activeCount += 1;
      processJob(job)
        .catch((error) => console.error("APK queue worker error:", error))
        .finally(() => {
          activeCount -= 1;
          setImmediate(drainQueue);
        });
    }
  } finally {
    draining = false;
  }
}

function cleanupOldArtifacts() {
  try {
    const dir = ensureArtifactDir();
    const cutoff = Date.now() - TTL_HOURS * 60 * 60 * 1000;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith(".apk")) continue;
      const filePath = path.join(dir, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(filePath);
      } catch (_) {}
    }
  } catch (error) {
    console.error("APK artifact cleanup error:", error.message || error);
  }
}

async function start() {
  if (started) return;
  started = true;
  ensureArtifactDir();
  cleanupOldArtifacts();
  const cleanupTimer = setInterval(cleanupOldArtifacts, 60 * 60 * 1000);
  cleanupTimer.unref?.();
  await ApkBuildJob.updateMany(
    { status: "building" },
    {
      $set: {
        status: "queued",
        progress: 0,
        message: "Queued after server restart.",
      },
    }
  );
  drainQueue().catch((error) => console.error("APK queue startup error:", error));
}

async function prepare({ userId, projectId, code }) {
  const cleaned = cleanCode(code);
  const codeHash = hashCode(cleaned);
  const query = {
    user: userId,
    project: projectId || null,
    codeHash,
    expiresAt: { $gt: new Date() },
    status: { $in: ["queued", "building", "ready"] },
  };

  let job = await ApkBuildJob.findOne(query).sort({ createdAt: -1 });
  if (
    job &&
    job.status === "ready" &&
    job.artifactPath &&
    !fs.existsSync(job.artifactPath)
  ) {
    job.status = "expired";
    job.message = "Cached APK artifact is no longer available.";
    await job.save();
    job = null;
  }

  if (!job) {
    job = await ApkBuildJob.create({
      jobId: crypto.randomUUID(),
      user: userId,
      project: projectId || null,
      codeHash,
      code: cleaned,
      buildType: "release",
      signingMode: hasCustomReleaseSigning()
        ? "custom-release"
        : "development-fallback",
      status: "queued",
      progress: 0,
      message: "Queued for release APK build.",
      expiresAt: new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000),
    });
    setImmediate(drainQueue);
  }

  return job;
}

async function createDownloadToken(jobId, userId) {
  const job = await ApkBuildJob.findOne({
    jobId,
    user: userId,
    status: "ready",
    expiresAt: { $gt: new Date() },
  });

  if (!job) return null;
  if (!job.artifactPath || !fs.existsSync(job.artifactPath)) {
    job.status = "expired";
    job.message = "APK artifact is no longer available.";
    await job.save();
    return null;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenExpiresAt = new Date(
    Math.min(
      job.expiresAt.getTime(),
      Date.now() + DOWNLOAD_TOKEN_TTL_MINUTES * 60_000
    )
  );

  job.downloadTokenHash = hashDownloadToken(token);
  job.downloadTokenExpiresAt = tokenExpiresAt;
  await job.save();

  return { job, token, tokenExpiresAt };
}

async function findByDownloadToken(token) {
  if (!token || String(token).length < 20) return null;
  const now = new Date();
  return ApkBuildJob.findOne({
    downloadTokenHash: hashDownloadToken(token),
    downloadTokenExpiresAt: { $gt: now },
    expiresAt: { $gt: now },
    status: "ready",
  });
}

function publicJob(job) {
  if (!job) return null;
  return {
    jobId: job.jobId,
    projectId: job.project ? String(job.project) : null,
    codeHash: job.codeHash,
    buildType: job.buildType || "release",
    signingMode: job.signingMode || "development-fallback",
    releaseSigned: job.signingMode === "custom-release",
    packageName: job.packageName || "",
    status: job.status,
    progress: job.progress,
    message: job.message,
    downloadLinkReady: job.status === "ready",
    selfHealing: {
      enabled: selfHealingBuild.MAX_REPAIR_ATTEMPTS > 0,
      maxRepairAttempts: selfHealingBuild.MAX_REPAIR_ATTEMPTS,
      repairCount: job.repairCount || 0,
      attempts: (job.repairAttempts || []).map((attempt) => ({
        attempt: attempt.attempt,
        strategy: attempt.strategy,
        categories: attempt.categories || [],
        summary: attempt.summary,
        changed: Boolean(attempt.changed),
        at: attempt.at,
      })),
      verificationStages: job.verificationStages || { analyze: "pending", apkBuild: "pending" },
    },
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    expiresAt: job.expiresAt,
  };
}

module.exports = {
  start,
  prepare,
  drainQueue,
  publicJob,
  hashCode,
  hashDownloadToken,
  createDownloadToken,
  findByDownloadToken,
  hasCustomReleaseSigning,
  artifactDir: APK_ARTIFACT_DIR,
};
