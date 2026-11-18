const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ApkBuildJob = require("../models/ApkBuildJob");
const Project = require("../models/Project");
const selfHealingBuild = require("./selfHealingBuild");

const {
  sanitizeGeneratedFlutterCode,
} = require("./exact500AppTemplates/flutterCodeSafety");

const {
  packageNameForProject,
  androidIdentityPatchPython,
} = require("../utils/apkIdentity");

const {
  normalizeProjectFiles,
  fixDartDirectiveOrder,
  repairStructuredProject,
} = require("./flutterProjectStructure");

const CONCURRENCY = Math.max(
  1,
  Number(process.env.APK_BUILD_CONCURRENCY || 1)
);

const BUILD_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.APK_BUILD_TIMEOUT_MS || 900_000)
);

const TTL_HOURS = Math.max(
  1,
  Number(process.env.APK_ARTIFACT_TTL_HOURS || 72)
);

const MAX_LOG_CHARS = Math.max(
  10_000,
  Number(process.env.APK_MAX_LOG_CHARS || 160_000)
);

const APK_BUILDER_VERSION = "qr-install-v5-structured-project";

const DOWNLOAD_TOKEN_TTL_MINUTES = Math.max(
  5,
  Number(process.env.APK_DOWNLOAD_TOKEN_TTL_MINUTES || 60)
);

const APK_FLUTTER_PATH_WSL =
  process.env.APK_FLUTTER_PATH_WSL || "";

const WEB_FLUTTER_PATH =
  process.env.FLUTTER_PATH || "";

const FLUTTER =
  APK_FLUTTER_PATH_WSL ||
  (/^[A-Za-z]:[\\/]/.test(WEB_FLUTTER_PATH)
    ? "/home/zainab1/flutter/bin/flutter"
    : WEB_FLUTTER_PATH) ||
  "/home/zainab1/flutter/bin/flutter";

const ANDROID_SDK =
  process.env.ANDROID_SDK_PATH ||
  "/home/zainab1/android-sdk";

const JAVA_HOME =
  process.env.JAVA_HOME_WSL ||
  "/usr/lib/jvm/java-17-openjdk-amd64";

const APK_BUILD_ROOT =
  process.env.APK_BUILD_PROJECT_PATH ||
  "/tmp/vibeapp-apk-builds";

const APK_ARTIFACT_DIR = path.resolve(
  process.env.APK_ARTIFACT_DIR ||
    path.join(__dirname, "..", "storage", "apks")
);

const SIGNING = {
  keystore:
    process.env.APK_SIGNING_KEYSTORE_WSL || "",

  storePassword:
    process.env.APK_SIGNING_STORE_PASSWORD || "",

  keyAlias:
    process.env.APK_SIGNING_KEY_ALIAS || "",

  keyPassword:
    process.env.APK_SIGNING_KEY_PASSWORD || "",
};

const REQUIRE_RELEASE_SIGNING =
  String(
    process.env.APK_REQUIRE_RELEASE_SIGNING || "false"
  ).toLowerCase() === "true";

let activeCount = 0;
let started = false;
let draining = false;

/* =========================================================
   FALLBACK PROJECT VERSIONS
========================================================= */

async function loadProjectFallbackCandidates(
  projectId,
  failedCode = ""
) {
  if (!projectId) return [];

  try {
    const project = await Project.findById(projectId)
      .select(
        "+lastKnownGoodCode currentCode generatedCode versions version lastKnownGoodVersion"
      )
      .lean();

    if (!project) return [];

    const candidates = [];

    const seen = new Set([
      String(failedCode || ""),
    ]);

    const add = (code, version, source) => {
      const value = String(code || "").trim();

      if (
        !value ||
        seen.has(value) ||
        !value.includes("void main")
      ) {
        return;
      }

      seen.add(value);

      candidates.push({
        code: value,
        version: Number(version || 0),
        source,
      });
    };

    add(
      project.lastKnownGoodCode,
      project.lastKnownGoodVersion,
      "last-known-good"
    );

    for (
      const item of (
        Array.isArray(project.versions)
          ? [...project.versions].reverse()
          : []
      )
    ) {
      add(
        item?.generatedCode,
        item?.version,
        "previous-project-version"
      );
    }

    add(
      project.currentCode,
      project.version,
      "current-project-code"
    );

    add(
      project.generatedCode,
      project.version,
      "generated-project-code"
    );

    return candidates.slice(0, 3);
  } catch (error) {
    console.warn(
      `[apk] could not load fallback project versions: ${
        error.message || error
      }`
    );

    return [];
  }
}

/* =========================================================
   LAST KNOWN GOOD CODE
========================================================= */

async function markProjectCodeVerified(
  projectId,
  code,
  version = 0
) {
  if (!projectId || !String(code || "").trim()) {
    return;
  }

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
    console.warn(
      `[apk] could not persist last-known-good code: ${
        error.message || error
      }`
    );
  }
}

/* =========================================================
   SIGNING
========================================================= */

function hasCustomReleaseSigning() {
  return Boolean(
    SIGNING.keystore &&
      SIGNING.storePassword &&
      SIGNING.keyAlias &&
      SIGNING.keyPassword
  );
}

/* =========================================================
   PATH HELPERS
========================================================= */

function windowsPathToWsl(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(
      /^([A-Za-z]):/,
      (_, drive) =>
        `/mnt/${drive.toLowerCase()}`
    );
}

function normalizeForWsl(value) {
  const text = String(value || "");

  return /^[A-Za-z]:[\\/]/.test(text)
    ? windowsPathToWsl(text)
    : text.replace(/\\/g, "/");
}

function shellQuote(value) {
  return `'${String(value).replace(
    /'/g,
    `'\"'\"'`
  )}'`;
}

/* =========================================================
   ARTIFACT
========================================================= */

function ensureArtifactDir() {
  fs.mkdirSync(APK_ARTIFACT_DIR, {
    recursive: true,
  });

  return APK_ARTIFACT_DIR;
}

/* =========================================================
   CODE CLEANING
========================================================= */

function cleanCode(code) {
  let clean = String(code || "")
    .replace(/^```dart\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .replace(
      /^\s*import\s+['"]dart:html['"](?:\s+as\s+\w+)?\s*;\s*$/gm,
      ""
    )
    .trim();

  clean = clean
    .replace(
      /ElevatedButton\.styleFrom\(\s*primary:/g,
      "ElevatedButton.styleFrom(backgroundColor:"
    )
    .replace(
      /TextButton\.styleFrom\(\s*primary:/g,
      "TextButton.styleFrom(foregroundColor:"
    )
    .replace(
      /OutlinedButton\.styleFrom\(\s*primary:/g,
      "OutlinedButton.styleFrom(foregroundColor:"
    )
    .replace(
      /styleFrom\(\s*primary:/g,
      "styleFrom(backgroundColor:"
    )
    .replace(
      /\bonPrimary:/g,
      "foregroundColor:"
    )
    .replace(
      /\bonSurface:/g,
      "foregroundColor:"
    )
    .replace(
      /\bprimaryVariant:/g,
      "primaryContainer:"
    )
    .replace(
      /\bsecondaryVariant:/g,
      "secondaryContainer:"
    )
    .replace(
      /\baccentColor:/g,
      "secondary:"
    )
    .replace(
      /\bbackground:/g,
      "surface:"
    );

  if (
    !clean.includes(
      "package:flutter/material.dart"
    )
  ) {
    clean =
      "import 'package:flutter/material.dart';\n\n" +
      clean;
  }

  if (!clean.includes("void main()")) {
    clean = `${clean}

void main() {
  runApp(const MyApp());
}
`;
  }

  return clean;
}

/* =========================================================
   PACKAGE DETECTION
========================================================= */

function detectPackages(code) {
  const packageMap = {
    "package:intl/": "intl: ^0.18.0",
    "package:http/": "http: ^1.1.0",
    "package:provider/": "provider: ^6.1.1",
    "package:shared_preferences/":
      "shared_preferences: ^2.2.2",
    "package:hive_flutter/":
      "hive_flutter: ^1.1.0",
    "package:dio/": "dio: ^5.3.3",
    "package:get/": "get: ^4.6.6",
    "package:flutter_bloc/":
      "flutter_bloc: ^8.1.3",
    "package:bloc/": "bloc: ^8.1.2",
    "package:rxdart/": "rxdart: ^0.27.7",
    "package:cached_network_image/":
      "cached_network_image: ^3.3.0",
    "package:flutter_svg/":
      "flutter_svg: ^2.0.9",
    "package:lottie/": "lottie: ^2.7.0",
    "package:google_fonts/":
      "google_fonts: ^6.1.0",
    "package:font_awesome_flutter/":
      "font_awesome_flutter: ^10.6.0",
    "package:animations/":
      "animations: ^2.0.8",
    "package:fl_chart/":
      "fl_chart: ^0.65.0",
    "package:sqflite/":
      "sqflite: ^2.3.0",
    "package:path/":
      "path: ^1.8.3",
    "package:url_launcher/":
      "url_launcher: ^6.2.1",
    "package:permission_handler/":
      "permission_handler: ^11.0.1",
    "package:geolocator/":
      "geolocator: ^10.1.0",
    "package:connectivity_plus/":
      "connectivity_plus: ^5.0.2",
    "package:path_provider/":
      "path_provider: ^2.1.1",
    "package:uuid/":
      "uuid: ^4.2.1",
    "package:crypto/":
      "crypto: ^3.0.3",
    "package:supabase_flutter/":
      "supabase_flutter: ^2.5.0",
  };

  return Object.entries(packageMap)
    .filter(([key]) => code.includes(key))
    .map(([, value]) => value);
}

/* =========================================================
   PUBSPEC
========================================================= */

function buildPubspec(packages) {
  return `name: vibeapp_apk_build
description: VibeApp generated APK build
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
${packages
  .map((pkg) => `  ${pkg}`)
  .join("\n")}

flutter:
  uses-material-design: true
`;
}

/* =========================================================
   HASHING
========================================================= */

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(
      `${APK_BUILDER_VERSION}\n${cleanCode(code)}`
    )
    .digest("hex");
}

function hashDownloadToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

/* =========================================================
   LOGGING
========================================================= */

function appendLog(current, text) {
  const next = `${current || ""}${text || ""}`;

  return next.length <= MAX_LOG_CHARS
    ? next
    : next.slice(
        next.length - MAX_LOG_CHARS
      );
}

/* =========================================================
   WSL SCRIPT
========================================================= */

function runWslScript(
  script,
  timeoutMs = BUILD_TIMEOUT_MS
) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(
      __dirname,
      "..",
      "storage",
      "scripts"
    );

    fs.mkdirSync(tempDir, {
      recursive: true,
    });

    const scriptPath = path.join(
      tempDir,
      `apk-script-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")}.sh`
    );

    fs.writeFileSync(
      scriptPath,
      script,
      {
        encoding: "utf8",
        mode: 0o700,
      }
    );

    const wslScriptPath =
      windowsPathToWsl(scriptPath);

    const safeScriptPath =
      wslScriptPath.replace(
        /"/g,
        '\\"'
      );

    const shellCommand =
      process.platform === "win32"
        ? `wsl bash "${safeScriptPath}"`
        : `bash "${safeScriptPath}"`;

    exec(
      shellCommand,
      {
        timeout: timeoutMs,
        maxBuffer:
          1024 * 1024 * 80,
      },
      (err, stdout, stderr) => {
        try {
          fs.unlinkSync(
            scriptPath
          );
        } catch (_) {}

        if (err) {
          const error = new Error(
            stderr ||
              stdout ||
              err.message ||
              "APK build failed"
          );

          error.stdout =
            stdout || "";

          error.stderr =
            stderr || "";

          return reject(error);
        }

        resolve({
          stdout:
            stdout || "",
          stderr:
            stderr || "",
        });
      }
    );
  });
}

/* =========================================================
   JOB UPDATE
========================================================= */

async function updateJob(
  jobId,
  patch
) {
  return ApkBuildJob.findOneAndUpdate(
    { jobId },
    patch,
    {
      returnDocument: "after",
    }
  );
}

/* =========================================================
   RELEASE SIGNING PATCH
========================================================= */

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
        imports = (
            "import java.util.Properties\n"
            "import java.io.FileInputStream\n\n"
        )

        if not text.startswith(
            "import java.util.Properties"
        ):
            text = imports + text

        prelude = '''\n// VIBEAPP_RELEASE_SIGNING
val vibeappKeystoreProperties = Properties()
val vibeappKeystoreFile = rootProject.file("key.properties")
if (vibeappKeystoreFile.exists()) {
    vibeappKeystoreProperties.load(FileInputStream(vibeappKeystoreFile))
}

'''

        text = text.replace(
            "android {",
            prelude + "android {",
            1
        )

        signing = '''\n    signingConfigs {
        create("vibeappRelease") {
            keyAlias = vibeappKeystoreProperties["keyAlias"] as String
            keyPassword = vibeappKeystoreProperties["keyPassword"] as String
            storeFile = vibeappKeystoreProperties["storeFile"]?.let { file(it) }
            storePassword = vibeappKeystoreProperties["storePassword"] as String
        }
    }

'''

        text = text.replace(
            "    buildTypes {",
            signing + "    buildTypes {",
            1
        )

        text = text.replace(
            'signingConfig = signingConfigs.getByName("debug")',
            'signingConfig = signingConfigs.getByName("vibeappRelease")'
        )

        kts.write_text(text)

elif groovy.exists():
    text = groovy.read_text()

    marker = "// VIBEAPP_RELEASE_SIGNING"

    if marker not in text:
        prelude = '''\n// VIBEAPP_RELEASE_SIGNING
def vibeappKeystoreProperties = new Properties()
def vibeappKeystoreFile = rootProject.file('key.properties')
if (vibeappKeystoreFile.exists()) {
    vibeappKeystoreProperties.load(new FileInputStream(vibeappKeystoreFile))
}

'''

        text = text.replace(
            "android {",
            prelude + "android {",
            1
        )

        signing = '''\n    signingConfigs {
        vibeappRelease {
            keyAlias vibeappKeystoreProperties['keyAlias']
            keyPassword vibeappKeystoreProperties['keyPassword']
            storeFile vibeappKeystoreProperties['storeFile'] ? file(vibeappKeystoreProperties['storeFile']) : null
            storePassword vibeappKeystoreProperties['storePassword']
        }
    }

'''

        text = text.replace(
            "    buildTypes {",
            signing + "    buildTypes {",
            1
        )

        text = text.replace(
            "signingConfig signingConfigs.debug",
            "signingConfig signingConfigs.vibeappRelease"
        )

        text = text.replace(
            "signingConfig = signingConfigs.debug",
            "signingConfig = signingConfigs.vibeappRelease"
        )

        groovy.write_text(text)

else:
    raise SystemExit(
        "Could not find Android app Gradle build file"
    )

PY`;
}

/* =========================================================
   SELF-HEALING HELPERS
========================================================= */

/**
 * Reduce a huge build log to the part Claude needs: the actual
 * analyzer / compiler error lines plus a little surrounding context.
 */
function condenseBuildError(details, maxChars = 14000) {
  const text = String(details || "");
  if (text.length <= maxChars) return text;

  const lines = text.split("\n");
  const keep = new Set();

  lines.forEach((line, i) => {
    if (
      /\berror\b|\bError:|Exception|FAILURE|Could not|lib\/.+\.dart:\d+/i.test(
        line
      )
    ) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 3); j++) {
        keep.add(j);
      }
    }
  });

  const picked = [...keep]
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join("\n");

  const result = picked.trim() ? picked : lines.slice(-200).join("\n");

  return result.length > maxChars
    ? result.slice(result.length - maxChars)
    : result;
}

/**
 * Errors handed to Claude: the latest build error, plus a note about
 * earlier failed repairs so it does not repeat a fix that did not work.
 */
function buildRepairErrors(details, repairAttempts, lastRepairFailure) {
  const errors = [condenseBuildError(details)];

  if (Array.isArray(repairAttempts) && repairAttempts.length > 0) {
    errors.push(
      "PREVIOUS REPAIR ATTEMPTS THAT STILL FAILED (do not repeat the same fix):\n" +
        repairAttempts
          .slice(-5)
          .map((a) => `- attempt ${a.attempt}: ${a.summary}`)
          .join("\n")
    );
  }

  if (lastRepairFailure) {
    errors.push(`LAST REPAIR RESPONSE WAS REJECTED: ${lastRepairFailure}`);
  }

  return errors;
}

/* =========================================================
   FLUTTER BUILD
========================================================= */

async function runFlutterBuildAttempt({
  code,
  projectFiles = [],
  workspaceWsl,
  artifactWsl,
  flutterWsl,
  androidWsl,
  javaWsl,
  signingScript,
  packageName,
}) {
  // main.dart is written from `code`, not from projectFiles, so it must
  // be fixed here too (misplaced `library` directive breaks dart format).
  code = fixDartDirectiveOrder(code);

  const normalizedProjectFiles =
    normalizeProjectFiles(
      projectFiles
    );

  const combinedSource = [
    code,
    ...normalizedProjectFiles.map(
      (file) =>
        file.content || ""
    ),
  ].join("\n");

  const packages =
    detectPackages(
      combinedSource
    );

  const pubspec =
    buildPubspec(packages);

  const pubspecHash =
    crypto
      .createHash("sha256")
      .update(pubspec)
      .digest("hex");

  const codeB64 =
    Buffer.from(
      code
    ).toString("base64");

  const pubspecB64 =
    Buffer.from(
      pubspec
    ).toString("base64");

  const filesPayload =
    Buffer.from(
      JSON.stringify(
        normalizedProjectFiles
      )
    ).toString("base64");

  const script = `#!/bin/bash
set -euo pipefail

FLUTTER_BIN=${shellQuote(
  flutterWsl
)}
ANDROID_SDK_DIR=${shellQuote(
  androidWsl
)}
JAVA_HOME_DIR=${shellQuote(
  javaWsl
)}
export WORKSPACE=${shellQuote(
  workspaceWsl
)}
ARTIFACT=${shellQuote(
  artifactWsl
)}
PUBSPEC_HASH=${shellQuote(
  pubspecHash
)}

export ANDROID_HOME="$ANDROID_SDK_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"
export JAVA_HOME="$JAVA_HOME_DIR"
export PATH="$(dirname "$FLUTTER_BIN"):$ANDROID_SDK_DIR/platform-tools:$ANDROID_SDK_DIR/emulator:$PATH"

if [ ! -f "$WORKSPACE/pubspec.yaml" ]; then
  rm -rf "$WORKSPACE"
  mkdir -p "$(dirname "$WORKSPACE")"

  "$FLUTTER_BIN" create \
    "$WORKSPACE" \
    --platforms android \
    --project-name vibeapp_apk_build
fi

cd "$WORKSPACE"

${androidIdentityPatchPython(
  packageName
)}

echo '${codeB64}' | base64 -d > "$WORKSPACE/lib/main.dart"

echo '${pubspecB64}' | base64 -d > "$WORKSPACE/pubspec.yaml"

# Restore every structured project file.
# This is important for Component Library projects because
# lib/main.dart can reference lib/generated/*.dart files.

echo '${filesPayload}' |
  base64 -d |
  python3 -c '
import json
import sys
import os

files = json.load(sys.stdin)

for file in files:
    relative_path = file.get("path")

    if not relative_path:
        continue

    if relative_path == "lib/main.dart":
        continue

    target = os.path.join(
        os.environ["WORKSPACE"],
        relative_path
    )

    parent = os.path.dirname(target)

    if parent:
        os.makedirs(
            parent,
            exist_ok=True
        )

    with open(
        target,
        "w",
        encoding="utf-8"
    ) as handle:
        handle.write(
            file.get("content", "")
        )
'

cd "$WORKSPACE"

OLD_HASH=""

if [ -f .vibeapp_pubspec_hash ]; then
  OLD_HASH="$(cat .vibeapp_pubspec_hash)"
fi

if [ "$OLD_HASH" != "$PUBSPEC_HASH" ] ||
   [ ! -f pubspec.lock ]; then

  echo "[vibeapp] resolving dependencies"

  "$FLUTTER_BIN" pub get

  printf '%s' "$PUBSPEC_HASH" > .vibeapp_pubspec_hash

else

  echo "[vibeapp] dependencies unchanged; skipping flutter pub get"

fi

${signingScript}

echo "[vibeapp] formatting generated Dart"

"$(dirname "$FLUTTER_BIN")/dart" \
  format \
  "$WORKSPACE/lib/main.dart" \
  >/dev/null

# Format all generated Dart files as well.
find "$WORKSPACE/lib" \
  -type f \
  -name "*.dart" \
  -not -path "$WORKSPACE/.dart_tool/*" \
  -print0 |
while IFS= read -r -d '' dart_file; do
  "$(dirname "$FLUTTER_BIN")/dart" \
    format \
    "$dart_file" \
    >/dev/null || true
done

echo "[vibeapp] running flutter analyze"

set +e

ANALYZE_OUTPUT=$(
  "$FLUTTER_BIN" analyze \
    --no-fatal-infos \
    --no-fatal-warnings \
    lib \
    2>&1
)

ANALYZE_STATUS=$?

set -e

printf '%s\\n' "$ANALYZE_OUTPUT"

if [ "$ANALYZE_STATUS" -ne 0 ]; then

  if printf '%s\\n' "$ANALYZE_OUTPUT" |
    grep -Eiq \
      '^[[:space:]]*error[[:space:]]*[•:-]|^ERROR\\|'; then

    echo "[vibeapp] analyzer found compile errors" >&2

    exit "$ANALYZE_STATUS"

  fi

  echo "[vibeapp] analyzer returned non-zero for warnings/info only; continuing to the real APK compile"

fi

echo "[vibeapp] building release APK"

"$FLUTTER_BIN" build apk --release

mkdir -p "$(dirname "$ARTIFACT")"

cp \
  "$WORKSPACE/build/app/outputs/flutter-apk/app-release.apk" \
  "$ARTIFACT"

rm -f "$WORKSPACE/android/key.properties"
`;

  return runWslScript(
    script,
    BUILD_TIMEOUT_MS
  );
}

/* =========================================================
   PROCESS APK JOB
========================================================= */

async function processJob(job) {
  const fullJob =
    await ApkBuildJob.findOne({
      jobId: job.jobId,
    }).select("+code");

  if (
    !fullJob ||
    fullJob.status !== "building"
  ) {
    return;
  }

  const customSigning =
    hasCustomReleaseSigning();

  if (
    REQUIRE_RELEASE_SIGNING &&
    !customSigning
  ) {
    await updateJob(
      fullJob.jobId,
      {
        status: "failed",
        progress: 100,
        message:
          "Release signing is required, but APK signing environment variables are not configured.",
        buildLogs:
          "Configure APK_SIGNING_KEYSTORE_WSL, APK_SIGNING_STORE_PASSWORD, APK_SIGNING_KEY_ALIAS, and APK_SIGNING_KEY_PASSWORD.",
        completedAt:
          new Date(),
      }
    );

    return;
  }

  const safeUserId =
    String(fullJob.user)
      .replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      );

  const safeProjectId =
    fullJob.project
      ? String(fullJob.project)
          .replace(
            /[^a-zA-Z0-9_-]/g,
            ""
          )
      : "new";

  const shortHash =
    fullJob.codeHash.slice(
      0,
      16
    );

  const packageName =
    packageNameForProject(
      fullJob.project,
      fullJob.user,
      fullJob.codeHash
    );

  const workspaceNative =
    path.join(
      APK_BUILD_ROOT,
      safeUserId,
      safeProjectId,
      shortHash
    );

  const workspaceWsl =
    normalizeForWsl(
      workspaceNative
    );

  const artifactDir =
    ensureArtifactDir();

  const artifactId =
    crypto.randomBytes(
      12
    ).toString("hex");

  const apkFileName =
    `vibeapp-${safeProjectId.slice(
      -8
    )}-${shortHash}-${artifactId}.apk`;

  const artifactNative =
    path.join(
      artifactDir,
      apkFileName
    );

  const artifactWsl =
    normalizeForWsl(
      artifactNative
    );

  /* =======================================================
     LOAD CURRENT PROJECT
  ======================================================= */

  let currentCode =
    cleanCode(
      sanitizeGeneratedFlutterCode(
        fullJob.code
      )
    );

  let currentFiles = [];

  if (fullJob.project) {
    try {
      const project =
        await Project.findById(
          fullJob.project
        )
          .select(
            "projectFiles currentCode generatedCode code"
          )
          .lean();

      const persistedFiles =
        Array.isArray(
          project?.projectFiles
        )
          ? project.projectFiles
          : [];

      /*
       * IMPORTANT:
       *
       * normalizeProjectFiles accepts
       * ONLY files.
       *
       * Do NOT call:
       *
       * normalizeProjectFiles(files, currentCode)
       */
      if (
        persistedFiles.length > 0
      ) {
        currentFiles =
          normalizeProjectFiles(
            persistedFiles
          );

        const persistedMain =
          currentFiles.find(
            (file) =>
              file.path ===
              "lib/main.dart"
          )?.content;

        if (
          persistedMain
        ) {
          currentCode =
            cleanCode(
              sanitizeGeneratedFlutterCode(
                persistedMain
              )
            );
        }
      }

      if (
        currentFiles.length === 0
      ) {
        const fallbackCode =
          cleanCode(
            sanitizeGeneratedFlutterCode(
              currentCode ||
                project?.currentCode ||
                project?.generatedCode ||
                project?.code ||
                ""
            )
          );

        if (
          fallbackCode
        ) {
          currentCode =
            fallbackCode;
        }
      }
    } catch (
      fileLoadError
    ) {
      console.warn(
        `[apk] could not load structured project files: ${
          fileLoadError.message ||
          fileLoadError
        }`
      );
    }
  }

  /*
   * If no structured project files exist,
   * create a valid single-file project.
   */
  if (
    currentFiles.length === 0 &&
    currentCode
  ) {
    currentFiles =
      normalizeProjectFiles([
        {
          path:
            "lib/main.dart",
          content:
            currentCode,
          language:
            "dart",
          role:
            "entrypoint",
        },
      ]);
  }

  if (
    currentFiles.length === 0
  ) {
    throw new Error(
      "No Flutter project files are available for APK build."
    );
  }

  currentCode =
    currentFiles.find(
      (file) =>
        file.path ===
        "lib/main.dart"
    )?.content ||
    currentCode;

  currentCode =
    cleanCode(
      sanitizeGeneratedFlutterCode(
        currentCode
      )
    );

  /* =======================================================
     LOGS / REPAIR STATE
  ======================================================= */

  let aggregateLogs =
    fullJob.buildLogs ||
    "";

  const repairAttempts =
    Array.isArray(
      fullJob.repairAttempts
    )
      ? [
          ...fullJob.repairAttempts,
        ]
      : [];

  await updateJob(
    fullJob.jobId,
    {
      progress: 8,

      message:
        "AI Build Guardian is preparing an isolated Android release workspace…",

      workspacePath:
        workspaceNative,

      packageName,

      signingMode:
        customSigning
          ? "custom-release"
          : "development-fallback",

      verificationStages: {
        analyze:
          "pending",
        apkBuild:
          "pending",
      },
    }
  );

  const flutterWsl =
    normalizeForWsl(
      FLUTTER
    );

  const androidWsl =
    normalizeForWsl(
      ANDROID_SDK
    );

  const javaWsl =
    normalizeForWsl(
      JAVA_HOME
    );

  const keystoreWsl =
    normalizeForWsl(
      SIGNING.keystore
    );

  /* =======================================================
     SIGNING SCRIPT
  ======================================================= */

  const signingScript =
    customSigning
      ? `
KEYSTORE_FILE=${shellQuote(
          keystoreWsl
        )}

STORE_PASSWORD=${shellQuote(
          SIGNING.storePassword
        )}

KEY_ALIAS=${shellQuote(
          SIGNING.keyAlias
        )}

KEY_PASSWORD=${shellQuote(
          SIGNING.keyPassword
        )}

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo "Configured APK signing keystore does not exist: $KEYSTORE_FILE" >&2
  exit 18
fi

cat > "$WORKSPACE/android/key.properties" <<EOF_KEY
storePassword=$STORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=$KEYSTORE_FILE
EOF_KEY

chmod 600 \
  "$WORKSPACE/android/key.properties"

cd "$WORKSPACE"

${signingPatchPython()}
`
      : "";

  /* =======================================================
     BUILD + SELF HEALING
  ======================================================= */

  const totalAttempts =
    selfHealingBuild.MAX_REPAIR_ATTEMPTS +
    1;

  let lastRepairFailure = "";

  for (
    let buildAttempt = 1;
    buildAttempt <= totalAttempts;
    buildAttempt += 1
  ) {
    try {
      const progress =
        Math.min(
          88,
          20 +
            (buildAttempt - 1) *
              20
        );

      await updateJob(
        fullJob.jobId,
        {
          progress,

          message:
            buildAttempt === 1
              ? "AI Build Guardian: analyzing and building generated app…"
              : `AI Build Guardian: verifying repair ${
                  buildAttempt - 1
                }/${selfHealingBuild.MAX_REPAIR_ATTEMPTS}…`,

          repairCount:
            repairAttempts.length,

          repairAttempts,
        }
      );

      const {
        stdout,
        stderr,
      } =
        await runFlutterBuildAttempt({
          code:
            currentCode,

          projectFiles:
            currentFiles,

          workspaceWsl,

          artifactWsl,

          flutterWsl,

          androidWsl,

          javaWsl,

          signingScript,

          packageName,
        });

      aggregateLogs =
        appendLog(
          aggregateLogs,
          `

=== BUILD ATTEMPT ${buildAttempt}: PASSED ===
${stdout}
${stderr}`
        );

      if (
        !fs.existsSync(
          artifactNative
        )
      ) {
        throw new Error(
          "Flutter finished without producing the expected release APK artifact."
        );
      }

      await updateJob(
        fullJob.jobId,
        {
          status:
            "ready",

          progress:
            100,

          message:
            repairAttempts.length
              ? `Verified APK ready after ${
                  repairAttempts.length
                } automatic repair${
                  repairAttempts.length === 1
                    ? ""
                    : "s"
                }.`
              : customSigning
              ? "Verified signed release APK ready."
              : "Verified release APK ready with development signing. Configure a release keystore before public distribution.",

          signingMode:
            customSigning
              ? "custom-release"
              : "development-fallback",

          artifactPath:
            artifactNative,

          artifactFileName:
            apkFileName,

          packageName,

          buildLogs:
            aggregateLogs,

          repairCount:
            repairAttempts.length,

          repairAttempts,

          verificationStages: {
            analyze:
              "passed",
            apkBuild:
              "passed",
          },

          completedAt:
            new Date(),
        }
      );

      await markProjectCodeVerified(
        fullJob.project,
        currentCode,
        0
      );

      await ApkBuildJob.updateOne(
        {
          jobId:
            fullJob.jobId,
        },
        {
          $unset: {
            code: 1,
            downloadTokenHash: 1,
            downloadTokenExpiresAt: 1,
          },
        }
      );

      return;
    } catch (error) {
      const details =
        `${error.stdout || ""}
${error.stderr || ""}
${error.message || error}`;

      aggregateLogs =
        appendLog(
          aggregateLogs,
          `

=== BUILD ATTEMPT ${buildAttempt}: FAILED ===
${details}`
        );

      console.error(
        `[apk:${fullJob.jobId}] build attempt ${buildAttempt} failed:`,
        error.message ||
          error
      );

      if (
        buildAttempt >=
        totalAttempts
      ) {
        break;
      }

      let repair;

      /* ===================================================
         STRUCTURED PROJECT REPAIR
      =================================================== */

      if (
        currentFiles.length > 1
      ) {
        /*
         * CORRECT SIGNATURE:
         *
         * repairStructuredProject({
         *   prompt,
         *   files,
         *   errors,
         *   appSpec,
         *   supabaseConfig
         * })
         */
        repair =
          await repairStructuredProject({
            prompt:
              "",

            files:
              currentFiles,

            errors: buildRepairErrors(details, repairAttempts, lastRepairFailure),

            appSpec:
              null,

            supabaseConfig:
              null,
          }).catch((repairError) => ({
            __failed: true,
            message: repairError?.message || String(repairError),
          }));

        if (repair && repair.__failed) {
          lastRepairFailure = repair.message;

          console.error(
            `[apk:${fullJob.jobId}] Claude repair attempt ${buildAttempt} failed: ${repair.message}. Retrying with the next attempt...`
          );

          aggregateLogs = appendLog(
            aggregateLogs,
            `\n[guardian] Claude repair attempt ${buildAttempt} was rejected: ${repair.message}`
          );

          repairAttempts.push({
            attempt: buildAttempt,
            strategy: "claude-structured-repair-rejected",
            categories: [],
            summary: `Repair rejected: ${String(repair.message).slice(0, 300)}`,
            changed: false,
            at: new Date(),
          });

          continue;
        }

        lastRepairFailure = "";

        if (
          !Array.isArray(
            repair?.files
          ) ||
          repair.files.length === 0
        ) {
          throw new Error(
            "Claude structured APK repair returned zero project files."
          );
        }

        /*
         * IMPORTANT:
         *
         * normalizeProjectFiles()
         * accepts ONLY one argument.
         */
        currentFiles =
          normalizeProjectFiles(
            repair.files
          );

        const repairedMain =
          currentFiles.find(
            (file) =>
              file.path ===
              "lib/main.dart"
          )?.content;

        if (
          repairedMain
        ) {
          currentCode =
            cleanCode(
              sanitizeGeneratedFlutterCode(
                repairedMain
              )
            );
        }

        repair.updatedCode =
          currentCode;
      } else {
        /* =================================================
           SINGLE-FILE REPAIR
        ================================================= */

        repair =
          await selfHealingBuild.repairCode({
            code:
              currentCode,

            buildLog:
              details,

            attempt:
              buildAttempt,
          });
      }

      /* ===================================================
         REPAIR RECORD
      =================================================== */

      const record = {
        attempt:
          buildAttempt,

        strategy:
          repair?.strategy ||
          "unknown",

        categories:
          Array.isArray(
            repair?.categories
          )
            ? repair.categories
                .map(
                  (item) =>
                    typeof item ===
                    "string"
                      ? item
                      : item?.type
                )
                .filter(
                  Boolean
                )
            : [],

        summary:
          repair?.summary ||
          "Automatic build repair completed.",

        changed:
          Boolean(
            repair?.changed
          ),

        at:
          new Date(),
      };

      repairAttempts.push(
        record
      );

      aggregateLogs =
        appendLog(
          aggregateLogs,
          `

[guardian] ${record.strategy}: ${record.summary}
[guardian] categories: ${record.categories.join(
            ", "
          )}`
        );

      await updateJob(
        fullJob.jobId,
        {
          progress:
            Math.min(
              90,
              32 +
                repairAttempts.length *
                  18
            ),

          message:
            repair.changed
              ? `Build issue detected (${record.categories.join(
                  ", "
                )}). Automatic repair applied; rebuilding…`
              : `Build issue detected (${record.categories.join(
                  ", "
                )}). No safe code repair was available.`,

          buildLogs:
            aggregateLogs,

          repairCount:
            repairAttempts.length,

          repairAttempts,

          verificationStages: {
            analyze:
              "failed",
            apkBuild:
              "failed",
          },
        }
      );

      if (!repair.changed) {
        if (repair.environmentFailure) {
          break;
        }

        lastRepairFailure =
          "The previous repair returned code identical to the failing code. Fix the reported error differently.";

        continue;
      }

      lastRepairFailure = "";

      /*
       * Determine the new main.dart.
       */
      const repairedCode =
        repair.updatedCode ||
        currentFiles.find(
          (file) =>
            file.path ===
            "lib/main.dart"
        )?.content ||
        currentCode;

      currentCode =
        cleanCode(
          sanitizeGeneratedFlutterCode(
            repairedCode
          )
        );

      /*
       * Keep the structured project
       * synchronized with repaired main.dart.
       */
      if (
        currentFiles.length >
        1
      ) {
        currentFiles =
          normalizeProjectFiles(
            currentFiles.map(
              (file) =>
                file.path ===
                "lib/main.dart"
                  ? {
                      ...file,
                      content:
                        currentCode,
                    }
                  : file
            )
          );
      } else {
        currentFiles =
          normalizeProjectFiles([
            {
              path:
                "lib/main.dart",

              content:
                currentCode,

              language:
                "dart",

              role:
                "entrypoint",
            },
          ]);
      }
    }
  }

  /* =======================================================
     FINAL FALLBACK
  ======================================================= */

  if (
    fullJob.project
  ) {
    const fallbackCandidates =
      await loadProjectFallbackCandidates(
        fullJob.project,
        fullJob.code
      );

    for (
      const candidate of fallbackCandidates
    ) {
      try {
        const compatibility =
          selfHealingBuild.deterministicRepair(
            candidate.code,
            aggregateLogs
          );

        const fallbackCode =
          cleanCode(
            sanitizeGeneratedFlutterCode(
              compatibility.updatedCode ||
                candidate.code
            )
          );

        currentFiles =
          normalizeProjectFiles([
            {
              path:
                "lib/main.dart",

              content:
                fallbackCode,

              language:
                "dart",

              role:
                "entrypoint",
            },
          ]);

        currentCode =
          fallbackCode;

        aggregateLogs =
          appendLog(
            aggregateLogs,
            `

=== FALLBACK VERIFY: ${candidate.source} v${
              candidate.version ||
              "?"
            } ===`
          );

        await updateJob(
          fullJob.jobId,
          {
            progress:
              94,

            message:
              "Latest version could not be verified. VibeApp is restoring a previous working version…",

            buildLogs:
              aggregateLogs,
          }
        );

        const {
          stdout,
          stderr,
        } =
          await runFlutterBuildAttempt({
            code:
              fallbackCode,

            projectFiles:
              currentFiles,

            workspaceWsl,

            artifactWsl,

            flutterWsl,

            androidWsl,

            javaWsl,

            signingScript,

            packageName,
          });

        aggregateLogs =
          appendLog(
            aggregateLogs,
            `
${stdout}
${stderr}
[guardian] fallback version verified successfully.`
          );

        if (
          !fs.existsSync(
            artifactNative
          )
        ) {
          throw new Error(
            "Fallback build did not produce the APK artifact."
          );
        }

        await markProjectCodeVerified(
          fullJob.project,
          fallbackCode,
          candidate.version
        );

        await updateJob(
          fullJob.jobId,
          {
            status:
              "ready",

            progress:
              100,

            message:
              "The latest update could not be verified, so VibeApp built the last working project version instead.",

            artifactPath:
              artifactNative,

            artifactFileName:
              apkFileName,

            packageName,

            buildLogs:
              aggregateLogs,

            recovered:
              true,

            recoveryStrategy:
              candidate.source,

            servedFallbackVersion:
              candidate.version,

            repairCount:
              repairAttempts.length,

            repairAttempts,

            verificationStages: {
              analyze:
                "passed",
              apkBuild:
                "passed",
            },

            completedAt:
              new Date(),
          }
        );

        await ApkBuildJob.updateOne(
          {
            jobId:
              fullJob.jobId,
          },
          {
            $unset: {
              code: 1,
              downloadTokenHash: 1,
              downloadTokenExpiresAt: 1,
            },
          }
        );

        return;
      } catch (
        fallbackError
      ) {
        aggregateLogs =
          appendLog(
            aggregateLogs,
            `

[guardian] fallback ${candidate.source} failed: ${
              fallbackError.message ||
              fallbackError
            }`
          );
      }
    }
  }

  /* =======================================================
     FINAL FAILED STATE
  ======================================================= */

  await updateJob(
    fullJob.jobId,
    {
      status:
        "failed",

      progress:
        100,

      message:
        repairAttempts.length
          ? `Build failed after ${
              repairAttempts.length
            } self-healing repair attempt${
              repairAttempts.length ===
              1
                ? ""
                : "s"
            }. Open the repair report and build logs.`
          : "APK build failed. AI Build Guardian could not apply a safe repair; open build logs for details.",

      buildLogs:
        aggregateLogs,

      repairCount:
        repairAttempts.length,

      repairAttempts,

      verificationStages: {
        analyze:
          "failed",
        apkBuild:
          "failed",
      },

      completedAt:
        new Date(),
    }
  );
}

/* =========================================================
   QUEUE
========================================================= */

async function drainQueue() {
  if (draining) {
    return;
  }

  draining = true;

  try {
    while (
      activeCount <
      CONCURRENCY
    ) {
      const job =
        await ApkBuildJob.findOneAndUpdate(
          {
            status:
              "queued",

            expiresAt: {
              $gt:
                new Date(),
            },
          },

          {
            $set: {
              status:
                "building",

              progress:
                5,

              message:
                "APK build worker started.",

              startedAt:
                new Date(),
            },
          },

          {
            sort: {
              createdAt:
                1,
            },

            returnDocument:
              "after",
          }
        );

      if (!job) {
        break;
      }

      activeCount += 1;

      processJob(job)
        .catch(
          (error) =>
            console.error(
              "APK queue worker error:",
              error
            )
        )
        .finally(
          () => {
            activeCount -=
              1;

            setImmediate(
              drainQueue
            );
          }
        );
    }
  } finally {
    draining =
      false;
  }
}

/* =========================================================
   CLEAN OLD ARTIFACTS
========================================================= */

function cleanupOldArtifacts() {
  try {
    const dir =
      ensureArtifactDir();

    const cutoff =
      Date.now() -
      TTL_HOURS *
        60 *
        60 *
        1000;

    for (
      const name of
        fs.readdirSync(
          dir
        )
    ) {
      if (
        !name
          .toLowerCase()
          .endsWith(
            ".apk"
          )
      ) {
        continue;
      }

      const filePath =
        path.join(
          dir,
          name
        );

      try {
        const stat =
          fs.statSync(
            filePath
          );

        if (
          stat.mtimeMs <
          cutoff
        ) {
          fs.unlinkSync(
            filePath
          );
        }
      } catch (_) {}
    }
  } catch (
    error
  ) {
    console.error(
      "APK artifact cleanup error:",
      error.message ||
        error
    );
  }
}

/* =========================================================
   START
========================================================= */

async function start() {
  if (started) {
    return;
  }

  started =
    true;

  ensureArtifactDir();

  cleanupOldArtifacts();

  const cleanupTimer =
    setInterval(
      cleanupOldArtifacts,
      60 *
        60 *
        1000
    );

  cleanupTimer.unref?.();

  await ApkBuildJob.updateMany(
    {
      status:
        "building",
    },
    {
      $set: {
        status:
          "queued",

        progress:
          0,

        message:
          "Queued after server restart.",
      },
    }
  );

  drainQueue().catch(
    (error) =>
      console.error(
        "APK queue startup error:",
        error
      )
  );
}

/* =========================================================
   PREPARE APK JOB
========================================================= */

async function prepare({
  userId,
  projectId,
  code,
}) {
  const cleaned =
    cleanCode(
      code
    );

  let hashInput =
    cleaned;

  if (projectId) {
    try {
      const project =
        await Project.findOne({
          _id:
            projectId,

          user:
            userId,
        })
          .select(
            "projectFiles"
          )
          .lean();

      const files =
        Array.isArray(
          project?.projectFiles
        )
          ? normalizeProjectFiles(
              project.projectFiles
            )
          : [];

      /*
       * Hash complete structured
       * project if multiple files
       * exist.
       */
      if (
        files.length >
        1
      ) {
        hashInput =
          JSON.stringify(
            files.map(
              (file) => ({
                path:
                  file.path,

                content:
                  file.content,
              })
            )
          );
      }
    } catch (
      error
    ) {
      console.warn(
        `[apk] structured project hash fallback: ${
          error.message ||
          error
        }`
      );
    }
  }

  const codeHash =
    hashCode(
      hashInput
    );

  const query = {
    user:
      userId,

    project:
      projectId ||
      null,

    codeHash,

    expiresAt: {
      $gt:
        new Date(),
    },

    status: {
      $in: [
        "queued",
        "building",
        "ready",
      ],
    },
  };

  let job =
    await ApkBuildJob.findOne(
      query
    ).sort({
      createdAt:
        -1,
    });

  if (
    job &&
    job.status ===
      "ready" &&
    job.artifactPath &&
    !fs.existsSync(
      job.artifactPath
    )
  ) {
    job.status =
      "expired";

    job.message =
      "Cached APK artifact is no longer available.";

    await job.save();

    job =
      null;
  }

  if (!job) {
    job =
      await ApkBuildJob.create({
        jobId:
          crypto.randomUUID(),

        user:
          userId,

        project:
          projectId ||
          null,

        codeHash,

        code:
          cleaned,

        buildType:
          "release",

        signingMode:
          hasCustomReleaseSigning()
            ? "custom-release"
            : "development-fallback",

        status:
          "queued",

        progress:
          0,

        message:
          "Queued for release APK build.",

        expiresAt:
          new Date(
            Date.now() +
              TTL_HOURS *
                60 *
                60 *
                1000
          ),
      });

    setImmediate(
      drainQueue
    );
  }

  return job;
}

/* =========================================================
   DOWNLOAD TOKEN
========================================================= */

async function createDownloadToken(
  jobId,
  userId
) {
  const job =
    await ApkBuildJob.findOne({
      jobId,

      user:
        userId,

      status:
        "ready",

      expiresAt: {
        $gt:
          new Date(),
      },
    });

  if (!job) {
    return null;
  }

  if (
    !job.artifactPath ||
    !fs.existsSync(
      job.artifactPath
    )
  ) {
    job.status =
      "expired";

    job.message =
      "APK artifact is no longer available.";

    await job.save();

    return null;
  }

  const token =
    crypto.randomBytes(
      32
    ).toString(
      "base64url"
    );

  const tokenExpiresAt =
    new Date(
      Math.min(
        job.expiresAt.getTime(),
        Date.now() +
          DOWNLOAD_TOKEN_TTL_MINUTES *
            60_000
      )
    );

  job.downloadTokenHash =
    hashDownloadToken(
      token
    );

  job.downloadTokenExpiresAt =
    tokenExpiresAt;

  await job.save();

  return {
    job,
    token,
    tokenExpiresAt,
  };
}

/* =========================================================
   FIND DOWNLOAD TOKEN
========================================================= */

async function findByDownloadToken(
  token
) {
  if (
    !token ||
    String(token).length <
      20
  ) {
    return null;
  }

  const now =
    new Date();

  return ApkBuildJob.findOne({
    downloadTokenHash:
      hashDownloadToken(
        token
      ),

    downloadTokenExpiresAt:
      {
        $gt:
          now,
      },

    expiresAt: {
      $gt:
        now,
    },

    status:
      "ready",
  });
}

/* =========================================================
   PUBLIC JOB
========================================================= */

function publicJob(job) {
  if (!job) {
    return null;
  }

  return {
    jobId:
      job.jobId,

    projectId:
      job.project
        ? String(
            job.project
          )
        : null,

    codeHash:
      job.codeHash,

    buildType:
      job.buildType ||
      "release",

    signingMode:
      job.signingMode ||
      "development-fallback",

    releaseSigned:
      job.signingMode ===
      "custom-release",

    packageName:
      job.packageName ||
      "",

    status:
      job.status,

    progress:
      job.progress,

    message:
      job.message,

    downloadLinkReady:
      job.status ===
      "ready",

    selfHealing: {
      enabled:
        selfHealingBuild.MAX_REPAIR_ATTEMPTS >
        0,

      maxRepairAttempts:
        selfHealingBuild.MAX_REPAIR_ATTEMPTS,

      repairCount:
        job.repairCount ||
        0,

      attempts:
        (
          job.repairAttempts ||
          []
        ).map(
          (attempt) => ({
            attempt:
              attempt.attempt,

            strategy:
              attempt.strategy,

            categories:
              attempt.categories ||
              [],

            summary:
              attempt.summary,

            changed:
              Boolean(
                attempt.changed
              ),

            at:
              attempt.at,
          })
        ),

      verificationStages:
        job.verificationStages ||
        {
          analyze:
            "pending",

          apkBuild:
            "pending",
        },
    },

    createdAt:
      job.createdAt,

    startedAt:
      job.startedAt,

    completedAt:
      job.completedAt,

    expiresAt:
      job.expiresAt,
  };
}

/* =========================================================
   EXPORTS
========================================================= */

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
  artifactDir:
    APK_ARTIFACT_DIR,
};