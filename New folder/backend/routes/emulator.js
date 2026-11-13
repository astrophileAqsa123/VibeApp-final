const express = require("express");
const router = express.Router();
const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const auth = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

/* =====================================================
   VibeApp Fast Preview Engine
   - First run: flutter run starts preview app
   - Next runs: update lib/main.dart + hot restart
   - APK build is not used for live preview anymore
===================================================== */

const ADB = process.env.ADB_PATH || "/home/zainab1/android-sdk/platform-tools/adb";
const FLUTTER = process.env.FLUTTER_PATH || "/home/zainab1/flutter/bin/flutter";
const ANDROID_SDK = process.env.ANDROID_SDK_PATH || "/home/zainab1/android-sdk";
const JAVA_HOME = process.env.JAVA_HOME_WSL || "/usr/lib/jvm/java-17-openjdk-amd64";
const WSL_HOME = process.env.WSL_HOME || "/home/zainab1";
const PROJECT = process.env.PREVIEW_PROJECT_PATH || "/tmp/vibeapp_preview";
const ADB_SERIAL = process.env.ADB_SERIAL || "emulator-5554";

const ADB_TARGET = `${ADB} -s ${ADB_SERIAL}`;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const BAD_TRANSFORM =
  `${WSL_HOME}/.gradle/caches/transforms-3/142c24f2530665bb6deb4123ab140714/transformed/jetified-window-java-1.0.0-beta04`;

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/* =====================================================
   Persistent Flutter process
===================================================== */

let flutterProcess = null;
let flutterStarting = false;
let flutterReady = false;
let lastPubspecHash = "";
let lastPackagesKey = "";
let runnerLogs = [];
let emulatorOwnerId = null;

const emulatorLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 8,
  prefix: "emulator",
});

function requestUserId(req) {
  return String(req.user?.id || req.user?.userId || "");
}

function pushLog(chunk) {
  const text = chunk.toString();
  runnerLogs.push(text);

  if (runnerLogs.length > 200) {
    runnerLogs = runnerLogs.slice(-200);
  }

  console.log(text);
}

function isFlutterRunning() {
  return flutterProcess && !flutterProcess.killed && flutterProcess.exitCode === null;
}

function getFlutterBinDir() {
  return path.posix.dirname(FLUTTER);
}

function shellEnvPrefix() {
  return `
export ANDROID_HOME=${ANDROID_SDK}
export ANDROID_SDK_ROOT=${ANDROID_SDK}
export JAVA_HOME=${JAVA_HOME}
export PATH=${getFlutterBinDir()}:${ANDROID_SDK}/platform-tools:${ANDROID_SDK}/emulator:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
`;
}

function runWSLScript(commands, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const script = [
      "#!/bin/bash",
      shellEnvPrefix(),
      "set -e",
      ...commands
    ].join("\n");

    const winPath = path.join(PUBLIC_DIR, "run.sh");
    const wslPath = winPath
      .replace(/\\/g, "/")
      .replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);

    fs.writeFileSync(winPath, script, "utf-8");

    exec(`wsl bash "${wslPath}"`, { timeout: timeoutMs }, (err, stdout, stderr) => {
      console.log("STDOUT:", stdout);
      console.log("STDERR:", stderr);

      if (err) {
        return reject(stderr || stdout || err.message);
      }

      resolve(stdout);
    });
  });
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

/* =====================================================
   Flutter code cleaning
===================================================== */

function cleanCode(code) {
  let clean = code
    .replace(/^```dart\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  clean = clean
    .split("\n")
    .filter(line => {
      const trimmed = line.trim();

      if (!trimmed.startsWith("import 'package:")) return true;

      const knownPackages = [
        "flutter/",
        "flutter_test/",
        "intl/",
        "http/",
        "provider/",
        "shared_preferences/",
        "dio/",
        "get/",
        "flutter_bloc/",
        "bloc/",
        "rxdart/",
        "cached_network_image/",
        "flutter_svg/",
        "lottie/",
        "google_fonts/",
        "font_awesome_flutter/",
        "animations/",
        "fl_chart/",
        "sqflite/",
        "path/",
        "image_picker/",
        "url_launcher/",
        "permission_handler/",
        "geolocator/",
        "connectivity_plus/",
        "path_provider/",
        "uuid/",
        "crypto/",
        "cupertino_icons/",
        "dart:"
      ];

      if (trimmed.includes("dart:html")) return false;

      return knownPackages.some(pkg =>
        trimmed.includes(`package:${pkg}`) || trimmed.includes(pkg)
      );
    })
    .join("\n");

  clean = clean
    .replace(/ElevatedButton\.styleFrom\(\s*primary:/g, "ElevatedButton.styleFrom(backgroundColor:")
    .replace(/TextButton\.styleFrom\(\s*primary:/g, "TextButton.styleFrom(foregroundColor:")
    .replace(/OutlinedButton\.styleFrom\(\s*primary:/g, "OutlinedButton.styleFrom(foregroundColor:")
    .replace(/styleFrom\(\s*primary:/g, "styleFrom(backgroundColor:")
    .replace(/(\bstyleFrom\b[\s\S]*?)\bprimary:/g, "$1backgroundColor:")
    .replace(/\bonPrimary:/g, "foregroundColor:")
    .replace(/\bonSurface:/g, "foregroundColor:")
    .replace(/\bprimaryVariant:/g, "primaryContainer:")
    .replace(/\bsecondaryVariant:/g, "secondaryContainer:")
    .replace(/\baccentColor:/g, "secondary:")
    .replace(/\bbackground:/g, "surface:");

  if (!clean.includes("void main()")) {
    clean = `import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

${clean}`;
  }

  if (!clean.includes("package:flutter/material.dart")) {
    clean = `import 'package:flutter/material.dart';\n${clean}`;
  }

  return clean;
}

function detectPackages(code) {
  const packageMap = {
    "package:intl/"                : "intl: ^0.18.0",
    "package:http/"                : "http: ^1.1.0",
    "package:provider/"            : "provider: ^6.1.1",
    "package:shared_preferences/"  : "shared_preferences: ^2.2.2",
    "package:hive_flutter/"        : "hive_flutter: ^1.1.0",
    "package:dio/"                 : "dio: ^5.3.3",
    "package:get/"                 : "get: ^4.6.6",
    "package:flutter_bloc/"        : "flutter_bloc: ^8.1.3",
    "package:bloc/"                : "bloc: ^8.1.2",
    "package:rxdart/"              : "rxdart: ^0.27.7",
    "package:cached_network_image/" : "cached_network_image: ^3.3.0",
    "package:flutter_svg/"         : "flutter_svg: ^2.0.9",
    "package:lottie/"              : "lottie: ^2.7.0",
    "package:google_fonts/"        : "google_fonts: ^6.1.0",
    "package:font_awesome_flutter/" : "font_awesome_flutter: ^10.6.0",
    "package:animations/"          : "animations: ^2.0.8",
    "package:fl_chart/"            : "fl_chart: ^0.65.0",
    "package:sqflite/"             : "sqflite: ^2.3.0",
    "package:path/"                : "path: ^1.8.3",
    "package:image_picker/"        : "image_picker: ^1.0.4",
    "package:url_launcher/"        : "url_launcher: ^6.2.1",
    "package:permission_handler/"  : "permission_handler: ^11.0.1",
    "package:geolocator/"          : "geolocator: ^10.1.0",
    "package:connectivity_plus/"   : "connectivity_plus: ^5.0.2",
    "package:path_provider/"       : "path_provider: ^2.1.1",
    "package:uuid/"                : "uuid: ^4.2.1",
    "package:crypto/"              : "crypto: ^3.0.3",
    "package:supabase_flutter/"    : "supabase_flutter: ^2.5.0"
  };

  return Object.entries(packageMap)
    .filter(([key]) => code.includes(key))
    .map(([, val]) => val);
}

function buildPubspec(packages) {
  return `name: vibeapp_preview
description: VibeApp generated Flutter preview
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
${packages.map(p => `  ${p}`).join("\n")}

flutter:
  uses-material-design: true
`;
}

/* =====================================================
   Project setup
===================================================== */

async function ensureDeviceReady() {
  console.log("\n[1] Checking selected emulator/device...");

  const output = await runWSLScript([
    `echo "Target device: ${ADB_SERIAL}"`,
    `${ADB} devices`,
    `state=$(${ADB_TARGET} get-state 2>/dev/null || true)`,
    `if [ "$state" != "device" ]; then echo "Target device not ready: ${ADB_SERIAL}"; exit 1; fi`
  ], 30000);

  return output;
}

async function ensurePreviewProject() {
  console.log("\n[2] Checking preview Flutter project...");

  await runWSLScript([
    `if [ ! -f "${PROJECT}/pubspec.yaml" ]; then`,
    `  echo "Creating Flutter preview project for the first time..."`,
    `  rm -rf ${PROJECT}`,
    `  ${FLUTTER} create ${PROJECT} --platforms android`,
    `else`,
    `  echo "Preview project already exists. Skipping flutter create."`,
    `fi`,

    `sed -i "s|gradle-[0-9.]*-bin.zip|gradle-7.5-bin.zip|" ${PROJECT}/android/gradle/wrapper/gradle-wrapper.properties || true`,

    `grep -qxF "android.suppressUnsupportedCompileSdk=34" ${PROJECT}/android/gradle.properties || echo "android.suppressUnsupportedCompileSdk=34" >> ${PROJECT}/android/gradle.properties`,
    `grep -qxF "android.useAndroidX=true" ${PROJECT}/android/gradle.properties || echo "android.useAndroidX=true" >> ${PROJECT}/android/gradle.properties`,
    `grep -qxF "org.gradle.jvmargs=-Xmx4096m" ${PROJECT}/android/gradle.properties || echo "org.gradle.jvmargs=-Xmx4096m" >> ${PROJECT}/android/gradle.properties`,

    `mkdir -p ${BAD_TRANSFORM}/META-INF/com/android/build/gradle/`,
    `printf "aarFormatVersion=1.0\\naarMetadataVersion=1.0\\nminCompileSdk=1\\nminCompileSdkExtension=0\\nminAgpVersion=1.0.0\\n" > ${BAD_TRANSFORM}/META-INF/com/android/build/gradle/aar-metadata.properties`
  ], 180000);
}

async function writeFlutterFiles(flutterCode, pubspec) {
  console.log("\n[3] Writing generated Flutter code...");

  const codeB64 = Buffer.from(flutterCode).toString("base64");
  const pubspecB64 = Buffer.from(pubspec).toString("base64");

  await runWSLScript([
    `echo '${codeB64}' | base64 -d > ${PROJECT}/lib/main.dart`,
    `echo '${pubspecB64}' | base64 -d > ${PROJECT}/pubspec.yaml`
  ], 60000);
}

async function runPubGetIfNeeded(pubspecHash, packagesKey) {
  const pubspecChanged = pubspecHash !== lastPubspecHash || packagesKey !== lastPackagesKey;

  if (!pubspecChanged) {
    console.log("✅ Dependencies unchanged. Skipping flutter pub get.");
    return false;
  }

  console.log("\n[4] Dependencies changed or first run. Running flutter pub get...");

  await runWSLScript([
    `cd ${PROJECT}`,
    `${FLUTTER} pub get`
  ], 180000);

  lastPubspecHash = pubspecHash;
  lastPackagesKey = packagesKey;

  return true;
}

/* =====================================================
   Flutter runner process
===================================================== */

function stopFlutterRunner() {
  return new Promise((resolve) => {
    if (!isFlutterRunning()) {
      flutterProcess = null;
      flutterReady = false;
      return resolve();
    }

    console.log("Stopping existing Flutter runner...");

    try {
      flutterProcess.stdin.write("q");
    } catch (_) {}

    setTimeout(() => {
      try {
        if (isFlutterRunning()) {
          flutterProcess.kill("SIGTERM");
        }
      } catch (_) {}

      flutterProcess = null;
      flutterReady = false;
      resolve();
    }, 2000);
  });
}

function startFlutterRunner() {
  return new Promise((resolve, reject) => {
    if (isFlutterRunning() && flutterReady) {
      return resolve("Flutter runner already active.");
    }

    if (flutterStarting) {
      return reject("Flutter runner is already starting. Please wait.");
    }

    flutterStarting = true;
    flutterReady = false;
    runnerLogs = [];

    console.log("\n[5] Starting Flutter debug runner...");

    const command = `
${shellEnvPrefix()}
cd ${PROJECT}
${FLUTTER} run -d ${ADB_SERIAL}
`;

    flutterProcess = spawn("wsl", ["bash", "-lc", command], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        flutterStarting = false;
        reject("Flutter run timeout. First run may take longer; check backend terminal logs.");
      }
    }, 480000);

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      pushLog(text);

      const readySignals = [
        "Flutter run key commands",
        "To hot reload changes while running",
        "An Observatory debugger",
        "The Flutter DevTools debugger"
      ];

      if (!resolved && readySignals.some(signal => text.includes(signal))) {
        resolved = true;
        flutterReady = true;
        flutterStarting = false;
        clearTimeout(timeout);
        resolve("Flutter runner started successfully.");
      }
    };

    flutterProcess.stdout.on("data", handleOutput);
    flutterProcess.stderr.on("data", handleOutput);

    flutterProcess.on("exit", (code) => {
      console.log(`Flutter runner exited with code: ${code}`);

      flutterProcess = null;
      flutterReady = false;
      flutterStarting = false;

      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(`Flutter runner exited before ready. Exit code: ${code}`);
      }
    });

    flutterProcess.on("error", (err) => {
      flutterProcess = null;
      flutterReady = false;
      flutterStarting = false;

      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err.message);
      }
    });
  });
}

function hotRestartFlutter() {
  return new Promise((resolve, reject) => {
    if (!isFlutterRunning()) {
      return reject("Flutter runner is not active.");
    }

    console.log("\n[5] Sending hot restart signal...");

    try {
      flutterProcess.stdin.write("R");
      resolve("Hot restart signal sent.");
    } catch (err) {
      reject(err.message);
    }
  });
}

/* =====================================================
   Main fast preview endpoint
===================================================== */

router.post("/run", auth, emulatorLimiter, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "No code provided" });
  }

  try {
    const ownerId = requestUserId(req);
    if ((isFlutterRunning() || flutterStarting) && emulatorOwnerId && emulatorOwnerId !== ownerId) {
      return res.status(409).json({
        success: false,
        message: "The emulator worker is busy. Please try again shortly.",
      });
    }
    emulatorOwnerId = ownerId;

    await ensureDeviceReady();
    await ensurePreviewProject();

    const flutterCode = cleanCode(code);
    const packages = detectPackages(flutterCode);
    const packagesKey = packages.join("|");
    const pubspec = buildPubspec(packages);
    const pubspecHash = hashText(pubspec);

    await writeFlutterFiles(flutterCode, pubspec);

    const dependenciesChanged = await runPubGetIfNeeded(pubspecHash, packagesKey);

    let mode = "hot-restart";

    if (dependenciesChanged) {
      await stopFlutterRunner();
      await startFlutterRunner();
      mode = "cold-run-dependencies-changed";
    } else if (isFlutterRunning()) {
      await hotRestartFlutter();
      mode = "hot-restart";
    } else {
      await startFlutterRunner();
      mode = "cold-run-first-time";
    }

    res.json({
      success: true,
      mode,
      message:
        mode === "hot-restart"
          ? "Fast preview updated using Flutter hot restart."
          : "Flutter preview started. First run may take longer."
    });
  } catch (err) {
    console.error("\n❌ Emulator preview error:", err);

    res.status(500).json({
      success: false,
      message: "Emulator preview failed. Please verify the generated code and try again."
    });
  }
});

/* =====================================================
   Optional: stop preview runner
===================================================== */

router.post("/stop", auth, async (req, res) => {
  try {
    if ((isFlutterRunning() || flutterStarting) && emulatorOwnerId !== requestUserId(req)) {
      return res.status(403).json({
        success: false,
        message: "You cannot stop another user's emulator preview.",
      });
    }
    await stopFlutterRunner();

    await runWSLScript([
      `${ADB_TARGET} shell am force-stop com.example.vibeapp_preview || true`
    ], 30000);

    emulatorOwnerId = null;
    res.json({
      success: true,
      message: "Preview runner stopped."
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to stop the preview runner."
    });
  }
});

/* =====================================================
   Optional: build APK only when user wants final export
===================================================== */

router.post("/build-apk", auth, emulatorLimiter, async (req, res) => {
  try {
    if (emulatorOwnerId && emulatorOwnerId !== requestUserId(req)) {
      return res.status(409).json({
        success: false,
        message: "The emulator worker is busy. Please try again shortly.",
      });
    }
    await ensurePreviewProject();

    await runWSLScript([
      `cd ${PROJECT}`,
      `${FLUTTER} build apk --debug --no-shrink --no-tree-shake-icons`
    ], 600000);

    res.json({
      success: true,
      message: "APK built successfully. Use the project APK endpoint to download it."
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "APK build failed."
    });
  }
});

router.get("/status", auth, (req, res) => {
  const isOwner = emulatorOwnerId === requestUserId(req);
  res.json({
    success: true,
    flutterRunning: isOwner && isFlutterRunning(),
    flutterReady: isOwner && flutterReady,
    flutterStarting: isOwner && flutterStarting,
    busy: Boolean(emulatorOwnerId) && !isOwner,
    lastLogs: isOwner ? runnerLogs.slice(-20) : []
  });
});

module.exports = router;
