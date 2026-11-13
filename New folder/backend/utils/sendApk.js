const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");

function safeFileName(value) {
  const fallback = "vibeapp-release.apk";
  const name = path.basename(String(value || fallback)).replace(/[\r\n"\\/]/g, "-");
  return name.toLowerCase().endsWith(".apk") ? name : `${name}.apk`;
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader || !String(rangeHeader).startsWith("bytes=")) return null;
  const value = String(rangeHeader).slice(6).split(",")[0].trim();
  const [rawStart, rawEnd] = value.split("-");

  if (rawStart === "") {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { invalid: true };
    const start = Math.max(0, size - suffixLength);
    return { start, end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd === "" ? size - 1 : Number(rawEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
    return { invalid: true };
  }
  return { start, end: Math.min(end, size - 1) };
}

/**
 * Stream an APK in a way Android/Chrome download managers can reliably finalize.
 *
 * Important details:
 * - exact Content-Length
 * - byte-range resume support
 * - identity encoding / no-transform so the byte count cannot be changed by middleware/proxies
 * - explicit Connection: close for local HTTP downloads so Android gets an unambiguous EOF
 * - stream.pipeline() so success/error completion is deterministic
 */
function sendApk(req, res, artifactPath, artifactFileName) {
  let stat;
  try {
    stat = fs.statSync(artifactPath);
  } catch (_) {
    if (!res.headersSent) res.status(404).json({ success: false, message: "APK artifact not found." });
    return;
  }

  if (!stat.isFile()) {
    return res.status(404).json({ success: false, message: "APK artifact not found." });
  }

  const size = stat.size;
  const fileName = safeFileName(artifactFileName);
  const range = parseRange(req.headers.range, size);

  // Prevent any proxy/middleware from transforming APK bytes after we calculate Content-Length.
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store, max-age=0, no-transform");
  res.setHeader("Content-Encoding", "identity");

  // This is especially helpful for local/LAN HTTP downloads on Android Chrome.
  // The browser receives an explicit socket EOF immediately after the exact body length.
  res.shouldKeepAlive = false;
  res.setHeader("Connection", "close");

  if (range?.invalid) {
    res.setHeader("Content-Range", `bytes */${size}`);
    return res.status(416).end();
  }

  let start = 0;
  let end = size - 1;
  if (range) {
    start = range.start;
    end = range.end;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  } else {
    res.status(200);
  }

  const contentLength = end - start + 1;
  res.setHeader("Content-Length", String(contentLength));

  if (req.method === "HEAD") {
    res.flushHeaders?.();
    return res.end();
  }

  const stream = fs.createReadStream(artifactPath, { start, end });
  const requestId = `${path.basename(artifactPath)}:${start}-${end}`;

  res.once("finish", () => {
    console.log(`[apk-download] finished ${requestId} (${contentLength} bytes)`);
  });
  res.once("close", () => {
    if (!res.writableEnded) {
      console.warn(`[apk-download] client closed early ${requestId}`);
    }
  });

  // Send headers immediately before the large body starts.
  res.flushHeaders?.();

  pipeline(stream, res, (error) => {
    if (!error) return;
    console.error(`[apk-download] stream failed ${requestId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Could not stream APK." });
    } else if (!res.destroyed) {
      res.destroy(error);
    }
  });
}

module.exports = { sendApk };
