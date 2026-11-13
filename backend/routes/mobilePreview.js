const express = require("express");
const crypto = require("crypto");
const { listLanIpv4Candidates } = require("../utils/networkAccess");

const MobilePreview = require("../models/MobilePreview");
const {
  buildMobilePreviewSchema,
} = require("../services/mobilePreviewSchemaBuilder");

const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");
const createLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  prefix: "mobile-preview",
});

function createSessionId() {
  return crypto.randomBytes(12).toString("hex");
}

function removeTrailingSlash(url = "") {
  return String(url || "").replace(/\/+$/, "");
}

function getPublicFrontendTargets(req) {
  const configured = [
    process.env.PUBLIC_FRONTEND_URL,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
  ].filter(Boolean).map(removeTrailingSlash);

  const requestOrigin = removeTrailingSlash(req.get("origin") || "");
  const targets = [];
  const seen = new Set();
  const add = (url, source) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    targets.push({ url, source });
  };

  for (const url of configured) {
    try {
      const host = new URL(url).hostname;
      if (!["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) add(url, "configured");
    } catch (_) {}
  }

  let frontendPort = 5173;
  try {
    if (requestOrigin) {
      const parsed = new URL(requestOrigin);
      frontendPort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
    }
  } catch (_) {}

  for (const candidate of listLanIpv4Candidates()) {
    add(`http://${candidate.address}:${frontendPort}`, candidate.interfaceName || "lan");
  }

  if (!targets.length && requestOrigin) add(requestOrigin, "request");
  if (!targets.length) add(`${req.protocol}://${req.get("host")}`.replace(":5000", ":5173"), "fallback");
  return targets;
}

router.post("/create", auth, createLimiter, async (req, res) => {
  try {
    const { prompt, generatedCode, schema } = req.body;

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const sessionId = createSessionId();

    const previewSchema = buildMobilePreviewSchema({
      prompt,
      schema,
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const preview = await MobilePreview.create({
      sessionId,
      user: req.user?.id || req.user?.userId,
      prompt,
      schema: previewSchema,
      generatedCode: generatedCode || "",
      expiresAt,
    });

    const frontendTargets = getPublicFrontendTargets(req);
    const previewUrl = `${frontendTargets[0].url}/preview/${preview.sessionId}`;
    const previewCandidates = frontendTargets.map((target) => ({
      url: `${target.url}/preview/${preview.sessionId}`,
      source: target.source,
    }));

    return res.status(201).json({
      success: true,
      message: "Mobile preview session created",
      sessionId: preview.sessionId,
      expiresAt: preview.expiresAt,
      previewUrl,
      qrPayload: previewUrl,
      previewCandidates,
      schema: previewSchema,
    });
  } catch (error) {
    console.error("Mobile preview create error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create mobile preview session",
    });
  }
});

router.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !String(sessionId).trim()) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const preview = await MobilePreview.findOne({ sessionId });

    if (!preview) {
      return res.status(404).json({
        success: false,
        message: "Mobile preview session not found",
      });
    }

    if (preview.expiresAt && preview.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({
        success: false,
        message: "Mobile preview session expired",
      });
    }

    return res.json({
      success: true,
      sessionId: preview.sessionId,
      prompt: preview.prompt,
      schema: preview.schema,
      expiresAt: preview.expiresAt,
    });
  } catch (error) {
    console.error("Mobile preview fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch mobile preview session",
    });
  }
});

module.exports = router;
