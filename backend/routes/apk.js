const express = require("express");
const router = express.Router();
const fs = require("fs");
const { sendApk } = require("../utils/sendApk");
const auth = require("../middleware/authMiddleware");
const Project = require("../models/Project");
const ApkBuildJob = require("../models/ApkBuildJob");
const apkBuildManager = require("../services/apkBuildManager");
const { createRateLimiter } = require("../middleware/rateLimit");
const { requestBaseUrl, phoneAccessibleBases, bestPhoneAccessibleBase } = require("../utils/networkAccess");
const { listAdbDevices, installApkArtifact } = require("../services/apkDeviceInstaller");

const prepareLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 12,
  prefix: "apk-prepare",
});
const linkLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  prefix: "apk-link",
});

function userIdFrom(req) {
  return req.user?.id || req.user?.userId;
}

async function ensureOwnedProject(projectId, userId) {
  if (!projectId) return true;
  return Boolean(await Project.exists({ _id: projectId, user: userId }));
}

/** Queue a release APK build or return the cached/in-progress build for the exact same code. */
router.post("/prepare", auth, prepareLimiter, async (req, res) => {
  try {
    const { code, projectId } = req.body;
    const userId = userIdFrom(req);

    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: "No Flutter code provided" });
    }

    if (!(await ensureOwnedProject(projectId, userId))) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const job = await apkBuildManager.prepare({ userId, projectId, code });
    return res.status(job.status === "ready" ? 200 : 202).json({
      success: true,
      cached: job.status === "ready",
      ...apkBuildManager.publicJob(job),
    });
  } catch (error) {
    console.error("APK prepare error:", error);
    return res.status(500).json({ success: false, message: "Could not prepare APK build" });
  }
});

/** Return current status for one user's APK build. */
router.get("/jobs/:jobId", auth, async (req, res) => {
  const userId = userIdFrom(req);
  const job = await ApkBuildJob.findOne({ jobId: req.params.jobId, user: userId });
  if (!job) return res.status(404).json({ success: false, message: "APK build job not found" });

  if (job.status === "ready" && job.artifactPath && !fs.existsSync(job.artifactPath)) {
    job.status = "expired";
    job.message = "APK artifact has expired. Build it again.";
    await job.save();
  }

  return res.json({ success: true, ...apkBuildManager.publicJob(job) });
});

/** Build logs for debugging failed jobs; only the owning user can access them. */
router.get("/jobs/:jobId/logs", auth, async (req, res) => {
  const userId = userIdFrom(req);
  const job = await ApkBuildJob.findOne({ jobId: req.params.jobId, user: userId }).select(
    "buildLogs status message signingMode buildType repairCount repairAttempts verificationStages"
  );
  if (!job) return res.status(404).json({ success: false, message: "APK build job not found" });
  return res.json({
    success: true,
    status: job.status,
    message: job.message,
    signingMode: job.signingMode,
    buildType: job.buildType,
    selfHealing: {
      repairCount: job.repairCount || 0,
      attempts: job.repairAttempts || [],
      verificationStages: job.verificationStages || {},
    },
    logs: job.buildLogs || "",
  });
});

/**
 * Create/rotate a short-lived bearer link for mobile/browser download.
 * The token itself is never stored in MongoDB; only its SHA-256 hash is stored.
 */
router.post("/jobs/:jobId/download-link", auth, linkLimiter, async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const result = await apkBuildManager.createDownloadToken(req.params.jobId, userId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Ready APK artifact was not found for this user.",
      });
    }

    const pagePath = `/apk-download/${encodeURIComponent(result.token)}`;
    const filePath = `${pagePath}/file`;
    const phoneCandidates = phoneAccessibleBases(req, [
      process.env.APK_PUBLIC_BASE_URL,
      process.env.MOBILE_PREVIEW_BASE_URL,
      process.env.PUBLIC_BACKEND_URL,
    ]);
    const phoneBase = bestPhoneAccessibleBase(req, [
      process.env.APK_PUBLIC_BASE_URL,
      process.env.MOBILE_PREVIEW_BASE_URL,
      process.env.PUBLIC_BACKEND_URL,
    ]);
    const browserBase = requestBaseUrl(req).replace(/\/+$/, "");

    return res.json({
      success: true,
      pagePath,
      filePath,
      pageUrl: browserBase ? `${browserBase}${pagePath}` : pagePath,
      fileUrl: browserBase ? `${browserBase}${filePath}` : filePath,
      qrUrl: phoneBase.baseUrl ? `${phoneBase.baseUrl}${pagePath}` : null,
      qrCandidates: phoneCandidates
        .filter((item) => item.reachableFromPhone)
        .map((item) => ({
          url: `${item.baseUrl}${pagePath}`,
          fileUrl: `${item.baseUrl}${filePath}`,
          source: item.source,
          address: item.lanIp || item.baseUrl,
          interfaceName: item.interfaceName || "",
        })),
      mobileReachable: phoneBase.reachableFromPhone,
      mobileUrlSource: phoneBase.source,
      expiresAt: result.tokenExpiresAt,
      signingMode: result.job.signingMode,
      releaseSigned: result.job.signingMode === "custom-release",
      buildType: result.job.buildType,
    });
  } catch (error) {
    console.error("APK download-link error:", error);
    return res.status(500).json({ success: false, message: "Could not create APK download link." });
  }
});

/** List Android devices visible to the backend ADB process. */
router.get("/devices", auth, async (_req, res) => {
  try {
    const result = await listAdbDevices();
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("ADB device list error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not query Android devices.",
    });
  }
});

/** Install an already-verified APK on a USB/ADB connected Android device. */
router.post("/jobs/:jobId/install", auth, async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const job = await ApkBuildJob.findOne({
      jobId: req.params.jobId,
      user: userId,
      status: "ready",
      expiresAt: { $gt: new Date() },
    });

    if (!job || !job.artifactPath || !fs.existsSync(job.artifactPath)) {
      return res.status(404).json({ success: false, message: "Ready APK artifact not found." });
    }

    const result = await installApkArtifact({
      apkPath: job.artifactPath,
      deviceId: req.body?.deviceId || "",
      packageName: job.packageName || "com.example.vibeapp_apk_build",
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("APK install error:", error);
    const status = /unauthorized|offline|no connected|not found/i.test(String(error.message || error)) ? 409 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Could not install APK on Android device.",
    });
  }
});

/** Authenticated owner-only direct download. Useful when a share token is not desired. */
router.get("/jobs/:jobId/download", auth, async (req, res) => {
  const userId = userIdFrom(req);
  const job = await ApkBuildJob.findOne({
    jobId: req.params.jobId,
    user: userId,
    status: "ready",
    expiresAt: { $gt: new Date() },
  });

  if (!job || !job.artifactPath || !fs.existsSync(job.artifactPath)) {
    return res.status(404).json({ success: false, message: "APK artifact not found." });
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  return sendApk(req, res, job.artifactPath, job.artifactFileName || "vibeapp-release.apk");
});

/** Compatibility endpoint for older frontends. It is asynchronous and never waits for Flutter. */
router.post("/build", auth, prepareLimiter, async (req, res) => {
  try {
    const { code, projectId } = req.body;
    const userId = userIdFrom(req);
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: "No Flutter code provided" });
    }
    if (!(await ensureOwnedProject(projectId, userId))) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const job = await apkBuildManager.prepare({ userId, projectId, code });
    return res.status(job.status === "ready" ? 200 : 202).json({
      success: true,
      ...apkBuildManager.publicJob(job),
    });
  } catch (error) {
    console.error("APK build queue error:", error);
    return res.status(500).json({ success: false, message: "Could not queue APK build" });
  }
});

router.get("/latest/download", auth, async (_req, res) => {
  return res.status(410).json({
    success: false,
    message: "The shared latest-APK endpoint was removed. APKs are cached per project/code version.",
  });
});

module.exports = router;
