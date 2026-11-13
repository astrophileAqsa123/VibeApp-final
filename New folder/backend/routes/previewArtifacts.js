const express = require("express");
const fs = require("fs");
const path = require("path");
const WebPreviewSession = require("../models/WebPreviewSession");

const router = express.Router();

function frameAncestorsValue(req) {
  let refererOrigin = "";
  try {
    const referer = req.get("referer");
    if (referer) refererOrigin = new URL(referer).origin;
  } catch (_) {}

  const configured = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://vibe-app-dun.vercel.app",
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.PUBLIC_FRONTEND_URL,
    refererOrigin,
  ]
    .filter(Boolean)
    .map((origin) => String(origin).trim().replace(/\/$/, ""));

  return ["'self'", ...new Set(configured)].join(" ");
}

router.use("/:publicToken", async (req, res) => {
  try {
    const session = await WebPreviewSession.findOne({
      publicToken: req.params.publicToken,
      status: "ready",
      expiresAt: { $gt: new Date() },
    })
      .select("artifactPath expiresAt")
      .lean();

    if (!session?.artifactPath) {
      return res.status(404).send("Preview not found or expired.");
    }

    const artifactRoot = path.resolve(session.artifactPath);
    let relativePath = decodeURIComponent(req.url.split("?")[0] || "/");
    relativePath = relativePath.replace(/^\/+/, "");
    if (!relativePath) relativePath = "index.html";

    const requestedPath = path.resolve(artifactRoot, relativePath);
    const insideRoot =
      requestedPath === artifactRoot ||
      requestedPath.startsWith(`${artifactRoot}${path.sep}`);

    if (!insideRoot) {
      return res.status(400).send("Invalid preview path.");
    }

    let filePath = requestedPath;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).send("Preview file not found.");
    }

    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      `frame-ancestors ${frameAncestorsValue(req)}`
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    if (path.basename(filePath) === "index.html") {
      res.setHeader("Cache-Control", "no-store, max-age=0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error("Preview artifact error:", error);
    return res.status(500).send("Preview could not be loaded.");
  }
});

module.exports = router;
