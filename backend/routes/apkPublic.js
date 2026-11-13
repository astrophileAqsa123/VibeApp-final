const express = require("express");
const fs = require("fs");
const router = express.Router();
const apkBuildManager = require("../services/apkBuildManager");
const ApkBuildJob = require("../models/ApkBuildJob");
const { createRateLimiter } = require("../middleware/rateLimit");
const { sendApk } = require("../utils/sendApk");

const publicDownloadLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: "apk-public",
});

router.use(publicDownloadLimiter);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baseHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function renderPage({ title, body, status = 200 }) {
  return {
    status,
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #f4f7f6; color: #18211e; display: grid; place-items: center; padding: 24px; }
    .card { width: min(100%, 520px); background: #fff; border: 1px solid #dce5e1; border-radius: 24px; padding: 28px; box-shadow: 0 20px 60px rgba(31, 55, 47, .12); }
    .brand { font-size: 13px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #52756a; margin-bottom: 10px; }
    h1 { font-size: clamp(28px, 7vw, 40px); margin: 0 0 12px; line-height: 1.05; }
    p { color: #60706a; line-height: 1.6; margin: 0 0 20px; }
    .meta { display: grid; gap: 10px; margin: 20px 0 24px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; background: #f7faf9; border-radius: 14px; font-size: 14px; }
    .row span:first-child { color: #6a7a74; }
    .row strong { text-align: right; }
    .secure { color: #176b49; }
    .warning { color: #8b5b12; }
    .btn { display: block; width: 100%; text-align: center; text-decoration: none; background: #183f34; color: #fff; padding: 15px 18px; border-radius: 14px; font-weight: 800; font-size: 16px; }
    .btn:active { transform: translateY(1px); }
    .note { font-size: 12px; margin-top: 16px; color: #7b8984; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`,
  };
}

router.get("/:token", async (req, res) => {
  baseHeaders(res);
  try {
    const job = await apkBuildManager.findByDownloadToken(req.params.token);
    if (!job || !job.artifactPath || !fs.existsSync(job.artifactPath)) {
      const page = renderPage({
        title: "APK link expired",
        status: 410,
        body: `<main class="card"><div class="brand">VibeApp</div><h1>Download link expired</h1><p>This APK link is invalid, expired, or the artifact is no longer available. Open the VibeApp project and generate a new download link.</p></main>`,
      });
      return res.status(page.status).type("html").send(page.html);
    }

    const releaseSigned = job.signingMode === "custom-release";
    const expiresAt = job.downloadTokenExpiresAt
      ? new Date(job.downloadTokenExpiresAt).toLocaleString()
      : "Soon";
    const page = renderPage({
      title: "Download VibeApp APK",
      body: `<main class="card">
        <div class="brand">VibeApp secure download</div>
        <h1>Your Android APK is ready</h1>
        <p>Download this generated Flutter app directly to your Android device. Android may ask you to allow installs from your browser before installation.</p>
        <div class="meta">
          <div class="row"><span>Build</span><strong>Release APK</strong></div>
          <div class="row"><span>Signing</span><strong class="${releaseSigned ? "secure" : "warning"}">${releaseSigned ? "Custom release key" : "Development signing"}</strong></div>
          <div class="row"><span>Link expires</span><strong>${escapeHtml(expiresAt)}</strong></div>
        </div>
        <a class="btn" href="/apk-download/${encodeURIComponent(req.params.token)}/file">Download APK</a>
        <p class="note">This is a temporary bearer link. Do not share it publicly. The link stops working after its expiry time.</p>
      </main>`,
    });
    return res.status(page.status).type("html").send(page.html);
  } catch (error) {
    console.error("Public APK page error:", error);
    const page = renderPage({
      title: "APK unavailable",
      status: 500,
      body: `<main class="card"><div class="brand">VibeApp</div><h1>APK unavailable</h1><p>The download page could not be loaded. Please create a fresh link from your project.</p></main>`,
    });
    return res.status(page.status).type("html").send(page.html);
  }
});

router.all("/:token/file", async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  baseHeaders(res);
  try {
    const job = await apkBuildManager.findByDownloadToken(req.params.token);
    if (!job || !job.artifactPath || !fs.existsSync(job.artifactPath)) {
      return res.status(410).json({ success: false, message: "APK download link expired or artifact unavailable." });
    }

    await ApkBuildJob.updateOne(
      { _id: job._id },
      { $inc: { downloadCount: 1 }, $set: { lastDownloadedAt: new Date() } }
    );

    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    return sendApk(req, res, job.artifactPath, job.artifactFileName || "vibeapp-release.apk");
  } catch (error) {
    console.error("Public APK file error:", error);
    return res.status(500).json({ success: false, message: "Could not download APK." });
  }
});

module.exports = router;
