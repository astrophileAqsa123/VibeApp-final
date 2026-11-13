import { apiRequest } from "./client";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getApiOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch (_) {
    return window.location.origin;
  }
}

function normalizePreviewStatus(status) {
  if (!status || status.status !== "ready") return status;

  // Prefer the relative path because it can be resolved against the exact API
  // origin that is already reachable by this browser. This avoids preview
  // failures caused by a stale PUBLIC_BACKEND_URL or a private LAN address.
  if (status.previewPath) {
    return {
      ...status,
      previewUrl: `${getApiOrigin()}${status.previewPath}`,
      url: `${getApiOrigin()}${status.previewPath}`,
    };
  }

  return status;
}

export function startWebPreview(code, projectId) {
  return apiRequest("/web-preview/run", {
    method: "POST",
    body: JSON.stringify({ code, projectId }),
  });
}

export function getWebPreviewStatus(sessionId) {
  return apiRequest(`/web-preview/jobs/${encodeURIComponent(sessionId)}`);
}

export function getWebPreviewLogs(sessionId) {
  return apiRequest(`/web-preview/jobs/${encodeURIComponent(sessionId)}/logs`);
}

export async function runWebPreview(code, projectId, onStatus) {
  const started = await startWebPreview(code, projectId);
  const sessionId = started.sessionId;

  if (!sessionId) {
    throw new Error("Preview server did not return a session id.");
  }

  onStatus?.(normalizePreviewStatus(started));

  const timeoutMs = Number(import.meta.env.VITE_WEB_PREVIEW_TIMEOUT_MS || 360000);
  const pollMs = Number(import.meta.env.VITE_WEB_PREVIEW_POLL_MS || 1500);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(pollMs);
    const status = normalizePreviewStatus(await getWebPreviewStatus(sessionId));
    onStatus?.(status);

    if (status.status === "ready") return status;

    if (["failed", "cancelled", "expired"].includes(status.status)) {
      const error = new Error(status.message || "Preview build failed.");
      error.sessionId = sessionId;
      error.previewStatus = status.status;
      throw error;
    }
  }

  const error = new Error("Preview build timed out while waiting for completion.");
  error.sessionId = sessionId;
  throw error;
}

export const stopWebPreview = (sessionId) =>
  apiRequest("/web-preview/stop", {
    method: "POST",
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });

export const createMobilePreview = (payload) =>
  apiRequest("/mobile-preview/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const prepareApk = (code, projectId) =>
  apiRequest("/apk/prepare", {
    method: "POST",
    body: JSON.stringify({ code, projectId }),
  });

export const getApkStatus = (jobId) =>
  apiRequest(`/apk/jobs/${encodeURIComponent(jobId)}`);

export const getApkLogs = (jobId) =>
  apiRequest(`/apk/jobs/${encodeURIComponent(jobId)}/logs`);

export const createApkDownloadLink = (jobId) =>
  apiRequest(`/apk/jobs/${encodeURIComponent(jobId)}/download-link`, {
    method: "POST",
  });

export const getApkDevices = () => apiRequest("/apk/devices");

export const installApkOnDevice = (jobId, deviceId = "") =>
  apiRequest(`/apk/jobs/${encodeURIComponent(jobId)}/install`, {
    method: "POST",
    body: JSON.stringify(deviceId ? { deviceId } : {}),
  });

export function resolveApiAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${getApiOrigin()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

// Backwards-compatible name used by older UI code. This now queues the build
// instead of blocking until Flutter/Gradle finishes.
export const buildApk = prepareApk;

export function projectExportUrl(id) {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${base}/projects/${id}/export`;
}

export async function downloadProjectExport(id) {
  const response = await fetch(projectExportUrl(id), {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
  });
  if (!response.ok) throw new Error("Project export failed.");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vibeapp-project.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
