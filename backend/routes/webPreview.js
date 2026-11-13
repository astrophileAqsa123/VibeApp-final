const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");
const WebPreviewSession = require("../models/WebPreviewSession");
const Project = require("../models/Project");
const webPreviewManager = require("../services/webPreviewManager");
const {
  requestBaseUrl: getRequestBaseUrl,
  phoneAccessibleBases,
  bestPhoneAccessibleBase,
} = require("../utils/networkAccess");

const router = express.Router();

const previewLimiter = createRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.WEB_PREVIEW_REQUESTS_PER_MINUTE || 8),
  prefix: "web-preview",
});

function requestUserId(req) {
  return String(req.user?.id || req.user?.userId || "");
}

function previewPathFor(session) {
  if (!session?.publicToken) return "";
  return `/previews/${session.publicToken}/`;
}

function buildStatusPayload(req, session) {
  const ready = session.status === "ready";
  const previewPath = ready ? previewPathFor(session) : null;
  const baseUrl = getRequestBaseUrl(req);
  const previewUrl = ready && previewPath
    ? (baseUrl ? `${baseUrl}${previewPath}` : previewPath)
    : null;
  const mobileCandidates = phoneAccessibleBases(req, [
    process.env.MOBILE_PREVIEW_BASE_URL,
    process.env.PUBLIC_BACKEND_URL,
  ]);
  const mobileBase = bestPhoneAccessibleBase(req, [
    process.env.MOBILE_PREVIEW_BASE_URL,
    process.env.PUBLIC_BACKEND_URL,
  ]);
  const mobilePreviewUrl = ready && previewPath && mobileBase.baseUrl
    ? `${mobileBase.baseUrl}${previewPath}`
    : null;
  const mobilePreviewCandidates = ready && previewPath
    ? mobileCandidates
        .filter((item) => item.reachableFromPhone)
        .map((item) => ({
          url: `${item.baseUrl}${previewPath}`,
          source: item.source,
          address: item.lanIp || item.baseUrl,
          interfaceName: item.interfaceName || "",
        }))
    : [];

  return {
    success: true,
    sessionId: session.sessionId,
    status: session.status,
    progress: session.progress,
    message: session.message,
    previewPath,
    previewUrl,
    url: previewUrl,
    mobilePreviewUrl,
    qrPayload: mobilePreviewUrl,
    mobilePreviewReachable: ready ? mobileBase.reachableFromPhone : null,
    mobilePreviewSource: ready ? mobileBase.source : null,
    mobilePreviewCandidates,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    recovered: Boolean(session.recovered),
    recoveryStrategy: session.recoveryStrategy || "",
    servedFallbackVersion: Number(session.servedFallbackVersion || 0),
  };
}

router.post("/run", auth, previewLimiter, async (req, res) => {
  try {
    const userId = requestUserId(req);
    const rawCode =
      req.body?.code ||
      req.body?.generatedCode ||
      req.body?.mainDart ||
      req.body?.flutterCode ||
      "";

    if (!rawCode || !String(rawCode).trim()) {
      return res.status(400).json({
        success: false,
        message: "Flutter code is required for web preview.",
      });
    }

    const projectId = req.body?.projectId || null;
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project id.",
      });
    }

    if (projectId) {
      const ownedProject = await Project.exists({ _id: projectId, user: userId });
      if (!ownedProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }
    }

    const sessionId = crypto.randomUUID();
    const publicToken = crypto.randomBytes(24).toString("hex");
    const ttlMinutes = Math.max(
      5,
      Number(process.env.WEB_PREVIEW_TTL_MINUTES || 60)
    );
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    const session = await WebPreviewSession.create({
      sessionId,
      publicToken,
      user: userId,
      project: projectId,
      status: "queued",
      progress: 0,
      message: "Queued for preview build.",
      expiresAt,
    });

    webPreviewManager.enqueue({
      sessionId,
      publicToken,
      userId,
      projectId,
      rawCode: String(rawCode),
    });

    return res.status(202).json(buildStatusPayload(req, session));
  } catch (error) {
    console.error("Create web preview error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not queue the web preview build.",
    });
  }
});

router.get("/jobs/:sessionId", auth, async (req, res) => {
  try {
    const session = await WebPreviewSession.findOne({
      sessionId: req.params.sessionId,
      user: requestUserId(req),
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Preview session not found.",
      });
    }

    return res.json(buildStatusPayload(req, session));
  } catch (error) {
    console.error("Web preview status error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load preview status.",
    });
  }
});

router.get("/jobs/:sessionId/logs", auth, async (req, res) => {
  try {
    const session = await WebPreviewSession.findOne({
      sessionId: req.params.sessionId,
      user: requestUserId(req),
    }).select("sessionId status buildLogs message");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Preview session not found.",
      });
    }

    return res.json({
      success: true,
      sessionId: session.sessionId,
      status: session.status,
      message: session.message,
      logs: session.buildLogs || "",
    });
  } catch (error) {
    console.error("Web preview logs error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load preview build logs.",
    });
  }
});

router.get("/status", auth, async (req, res) => {
  try {
    const session = await WebPreviewSession.findOne({
      user: requestUserId(req),
      status: { $in: ["queued", "building", "ready"] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.json({
        success: true,
        active: false,
        status: "idle",
        previewUrl: null,
      });
    }

    return res.json({
      ...buildStatusPayload(req, session),
      active: true,
    });
  } catch (error) {
    console.error("Latest web preview status error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load preview status.",
    });
  }
});

router.all("/stop", auth, async (req, res) => {
  try {
    const userId = requestUserId(req);
    const requestedSessionId = req.body?.sessionId || req.query?.sessionId || "";

    let session;
    if (requestedSessionId) {
      session = await WebPreviewSession.findOne({
        sessionId: requestedSessionId,
        user: userId,
      });
    } else {
      session = await WebPreviewSession.findOne({
        user: userId,
        status: { $in: ["queued", "building", "ready"] },
      }).sort({ createdAt: -1 });
    }

    if (!session) {
      return res.json({
        success: true,
        message: "No active preview to stop.",
      });
    }

    await webPreviewManager.cancel(session.sessionId);

    return res.json({
      success: true,
      sessionId: session.sessionId,
      message: "Preview stopped.",
    });
  } catch (error) {
    console.error("Stop web preview error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not stop the preview.",
    });
  }
});

module.exports = router;
