import { useEffect, useState } from "react";

import { getWebPreviewStatus, runWebPreview, stopWebPreview } from "../../../api/previewApi";

/**
 * Isolated Flutter Web preview sessions: run / stop / rebuild, the phone QR
 * preview, and best-effort cleanup when the page or tab is closed.
 *
 *  - code:        code currently displayed in the studio
 *  - onReady:     called with the built code once a preview is ready (used to start the APK build)
 *  - onShowPreview: switch the right column to the "Preview" tab
 */
export default function useWebPreview({ projectId, code, setError, setNotice, onReady, onShowPreview }) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewSessionId, setPreviewSessionId] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [mobileCandidates, setMobileCandidates] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [buildStatus, setBuildStatus] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [isHotReloading, setIsHotReloading] = useState(false);

  // Preview artifacts are isolated per session and expire automatically.
  // Stop only this user's current session when leaving the project page.
  useEffect(() => {
    return () => {
      if (previewSessionId) {
        stopWebPreview(previewSessionId).catch(() => {});
      }
    };
  }, [previewSessionId]);

  // Best-effort cleanup on browser/tab close. The TTL still guarantees cleanup
  // if the request cannot be delivered during page unload.
  useEffect(() => {
    if (!previewSessionId) return undefined;

    const handleUnload = () => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token") || "";
      const stopUrl = `${base}/web-preview/stop`;

      try {
        fetch(stopUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sessionId: previewSessionId }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Page-unload cleanup is best effort; the server-side TTL is the fallback.
      }
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [previewSessionId]);

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const reportProgress = (fallback) => (status) => {
    const progress = Number.isFinite(status.progress) ? ` (${status.progress}%)` : "";
    setBuildStatus(`${status.message || fallback}${progress}`);
  };

  // One place that applies a finished preview build to state.
  const applyPreviewData = (data, fallbackUrl = "") => {
    setPreviewSessionId(data.sessionId);
    setPreviewUrl(data.previewUrl || data.url || fallbackUrl);
    setMobileUrl(data.mobilePreviewUrl || data.qrPayload || "");
    setMobileCandidates(data.mobilePreviewCandidates || []);
    setPreviewKey(Date.now());
  };

  const notifyReady = (builtCode) => {
    Promise.resolve(onReady?.(builtCode)).catch(() => {});
  };

  const stopCurrentSession = () => {
    if (previewSessionId) stopWebPreview(previewSessionId).catch(() => {});
  };

  /** Stop the session and clear all preview state (used when restoring a version). */
  const resetPreview = () => {
    if (!previewSessionId) return;
    stopCurrentSession();
    setPreviewSessionId("");
    setPreviewUrl("");
    setMobileUrl("");
    setMobileCandidates([]);
  };

  /* ── Run / stop (toggle) ─────────────────────────────────────────────── */
  const runPreview = async () => {
    setPreviewLoading(true);
    setError("");
    setNotice("");

    if (previewUrl && previewSessionId) {
      setBuildStatus("Stopping preview…");
      try {
        const data = await stopWebPreview(previewSessionId);
        setPreviewUrl("");
        setPreviewSessionId("");
        setMobileUrl("");
        setMobileCandidates([]);
        setShowQR(false);
        setNotice(data.message || "Preview stopped.");
      } catch (err) {
        setError(err.message);
      } finally {
        setBuildStatus("");
        setPreviewLoading(false);
      }
      return;
    }

    try {
      const data = await runWebPreview(code, projectId, reportProgress("Building preview…"));
      applyPreviewData(data);
      onShowPreview?.();
      setNotice(data.message || "Preview ready.");
      // Start Android packaging after the validated web preview is ready. This
      // removes APK compilation from the later Download click.
      notifyReady(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildStatus("");
      setPreviewLoading(false);
    }
  };

  /* ── Rebuild preview (refresh button) ────────────────────────────────── */
  const reloadPreview = async () => {
    if (!previewUrl) {
      return runPreview();
    }

    const previousSessionId = previewSessionId;
    setIsHotReloading(true);
    setError("");
    setNotice("Building a fresh isolated preview…");

    try {
      const data = await runWebPreview(code, projectId, reportProgress("Building preview…"));
      applyPreviewData(data);
      setNotice("Preview rebuilt successfully.");
      notifyReady(code);

      if (previousSessionId && previousSessionId !== data.sessionId) {
        stopWebPreview(previousSessionId).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildStatus("");
      setIsHotReloading(false);
    }
  };

  /* ── After a chat edit: build a new isolated preview, then retire the old
        session only after the replacement is ready. ────────────────────── */
  const rebuildAfterUpdate = async (newCode) => {
    if (!previewUrl) return;

    const previousSessionId = previewSessionId;
    setIsHotReloading(true);
    setNotice("Building updated preview…");

    try {
      const data = await runWebPreview(newCode, projectId, reportProgress("Building updated preview…"));
      applyPreviewData(data, previewUrl);
      setNotice("Updated preview is ready.");
      notifyReady(newCode);

      if (previousSessionId && previousSessionId !== data.sessionId) {
        stopWebPreview(previousSessionId).catch(() => {});
      }
    } catch (reloadErr) {
      console.warn("Preview rebuild warning:", reloadErr);
      setNotice("Code updated. Click 'Run preview' to build the new preview.");
    } finally {
      setBuildStatus("");
      setIsHotReloading(false);
    }
  };

  /* ── Mobile QR ───────────────────────────────────────────────────────── */
  const makeMobilePreview = async () => {
    setPreviewLoading(true);
    setError("");
    setNotice("");

    try {
      // The QR must point to the exact Flutter Web artifact currently shown in
      // the studio. Do not generate a separate schema/mock mobile preview.
      let data = null;

      if (previewSessionId) {
        data = await getWebPreviewStatus(previewSessionId);
      }

      if (!data || data.status !== "ready") {
        setBuildStatus("Building preview for QR…");
        data = await runWebPreview(code, projectId, reportProgress("Building preview…"));
        applyPreviewData(data);
        onShowPreview?.();
      }

      const phoneUrl = data.mobilePreviewUrl || data.qrPayload || "";
      if (!phoneUrl) {
        throw new Error(
          "Could not create a phone-accessible preview URL. Connect the phone and computer to the same Wi-Fi, or configure MOBILE_PREVIEW_BASE_URL."
        );
      }

      setMobileUrl(phoneUrl);
      setMobileCandidates(data.mobilePreviewCandidates || []);
      setShowQR(true);
      setNotice("QR ready — scanning it opens this exact Flutter preview in the phone browser.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildStatus("");
      setPreviewLoading(false);
    }
  };

  return {
    previewLoading,
    previewUrl,
    previewKey,
    buildStatus,
    isHotReloading,
    mobileUrl,
    mobileCandidates,
    showQR,
    closeQR: () => setShowQR(false),
    runPreview,
    reloadPreview,
    rebuildAfterUpdate,
    makeMobilePreview,
    resetPreview,
    stopCurrentSession,
  };
}
