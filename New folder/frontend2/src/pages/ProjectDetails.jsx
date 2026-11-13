import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowUp,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCode,
  FiCopy,
  FiCpu,
  FiDownload,
  FiExternalLink,
  FiMic,
  FiMonitor,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiShare2,
  FiSmartphone,
  FiSquare,
  FiTablet,
  FiX,
  FiZap,
} from "react-icons/fi";

import { getProject, getVersionDiff, restoreProjectVersion, updateProjectChat } from "../api/projectApi";
import {
  getApkStatus,
  prepareApk,
  createApkDownloadLink,
  getApkDevices,
  installApkOnDevice,
  resolveApiAssetUrl,
  downloadProjectExport,
  getWebPreviewStatus,
  runWebPreview,
  stopWebPreview,
} from "../api/previewApi";
import MobileQRModal from "../components/MobileQRModal";
import ApkDownloadModal from "../components/ApkDownloadModal";
import ThemeToggle from "../components/ThemeToggle";

import "./ProjectDetails.css";

const TIPS = [
  {
    icon: "✦",
    title: "Flutter & Dart Architecture",
    desc: "VibeApp generates production-grade Flutter widgets with null safety, reactive state management, and native performance on every screen.",
  },
  {
    icon: "⚡",
    title: "Supabase Realtime Backend",
    desc: "Auto-provisioned PostgreSQL tables and instant CRUD APIs. Add auth, storage, and database features just by prompting.",
  },
  {
    icon: "📱",
    title: "Cross-Platform Perfection",
    desc: "Your app looks beautiful on iPhone, Android phones, iPads, tablets, and web browsers with adaptive layout breakpoints.",
  },
  {
    icon: "🛠",
    title: "Yours To Keep",
    desc: "Export clean Flutter source code, build release APKs, or download the full ZIP project anytime. Zero lock-in.",
  },
];

const QUICK_PROMPTS = [
  "Add dark mode toggle",
  "Change accent color to emerald",
  "Add search and filter bar",
  "Add smooth entry animations",
  "Add pull-to-refresh list",
];

// Keep the Flutter iframe at real CSS-pixel device dimensions, then scale only
// the visual shell so the complete phone/tablet remains visible in the studio.
const DEVICE_FRAME_SIZES = {
  iphone: { outerWidth: 413, outerHeight: 872, viewport: "393 × 852" },
  android: { outerWidth: 428, outerHeight: 931, viewport: "412 × 915" },
  tablet: { outerWidth: 792, outerHeight: 1048, viewport: "768 × 1024" },
  desktop: { outerWidth: 1280, outerHeight: 800, viewport: "1280 × 762" },
};

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewSessionId, setPreviewSessionId] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [mobileCandidates, setMobileCandidates] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [, setApkLoading] = useState(false);
  const [apkJobId, setApkJobId] = useState("");
  const [apkStatus, setApkStatus] = useState("idle");
  const [apkProgress, setApkProgress] = useState(0);
  const [apkMessage, setApkMessage] = useState("");
  const [apkDownloadUrl, setApkDownloadUrl] = useState("");
  const [apkPageUrl, setApkPageUrl] = useState("");
  const [apkQrUrl, setApkQrUrl] = useState("");
  const [apkQrCandidates, setApkQrCandidates] = useState([]);
  const [apkInstallState, setApkInstallState] = useState({ busy: false, message: "" });
  const [apkLinkExpiresAt, setApkLinkExpiresAt] = useState("");
  const [apkReleaseSigned, setApkReleaseSigned] = useState(false);
  const [apkMobileReachable, setApkMobileReachable] = useState(null);
  const [showApkModal, setShowApkModal] = useState(false);
  const [, setApkCodeHash] = useState("");
  const apkPollGenerationRef = useRef(0);
  const [buildStatus, setBuildStatus] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionDiff, setVersionDiff] = useState(null);

  // Workspace controls: tab = "preview" | "code", device = "iphone" | "android" | "tablet" | "desktop"
  const [activeTab, setActiveTab] = useState("preview");
  const [codeFile, setCodeFile] = useState("main.dart"); // "main.dart" | "schema.sql"
  const [device, setDevice] = useState("iphone");
  const stageRef = useRef(null);
  const [deviceScale, setDeviceScale] = useState(1);
  const [tipIndex, setTipIndex] = useState(0);
  const [showChips, setShowChips] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [isHotReloading, setIsHotReloading] = useState(false);

  const threadBottomRef = useRef(null);

  useEffect(() => {
    getProject(projectId)
      .then((data) => setProject(data.project))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!selectedVersion || selectedVersion <= 1) {
      setVersionDiff(null);
      return;
    }
    getVersionDiff(projectId, selectedVersion - 1, selectedVersion)
      .then((data) => setVersionDiff(data.diff || null))
      .catch(() => setVersionDiff(null));
  }, [projectId, selectedVersion]);

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

  // Rotate tips when building
  useEffect(() => {
    if (!previewLoading && !updating) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [previewLoading, updating]);

  const code = project?.currentCode || "";
  const versions = project?.versions || [];

  // Derive version items for the prompt stream
  const versionList =
    versions.length > 0
      ? versions
      : project
      ? [{ version: 1, prompt: project.prompt, generatedCode: code, createdAt: project.createdAt }]
      : [];

  const activeSnapshot = versionList.find((v) => v.version === selectedVersion);
  const displayedCode = activeSnapshot?.generatedCode || code;
  const displayedPrompt = activeSnapshot?.prompt || project?.prompt || "";
  const displayedStorageMode = activeSnapshot?.storageMode || project?.storageMode || "local";
  const displayedTableName = activeSnapshot?.supabaseTable || project?.supabaseTable || "items";

  const isSupabaseProject =
    displayedStorageMode === "supabase" ||
    Boolean(!activeSnapshot && project?.supabaseUrl) ||
    Boolean(activeSnapshot ? activeSnapshot.tableSql : project?.tableSql) ||
    Boolean(displayedCode && (displayedCode.includes("supabase_flutter") || displayedCode.includes("Supabase.initialize")));

  const fallbackSql = `-- Create table for ${displayedTableName}
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
CREATE TABLE IF NOT EXISTS ${displayedTableName} (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE ${displayedTableName} ENABLE ROW LEVEL SECURITY;

-- Allow read and write access for development
CREATE POLICY "Allow all access" ON ${displayedTableName}
  FOR ALL USING (true) WITH CHECK (true);`;

  const snapshotSql = activeSnapshot?.tableSql || project?.tableSql || "";
  const currentTableSql = snapshotSql.trim() ? snapshotSql : fallbackSql;

  // APK artifacts belong to an exact code hash. When the selected/generated code
  // changes, stop presenting the previous APK as current. The server can still
  // finish that older background job, but this screen will ignore its result.
  useEffect(() => {
    apkPollGenerationRef.current += 1;
    // Reset build artifacts because they belong to the previous exact code hash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApkJobId("");
    setApkStatus("idle");
    setApkProgress(0);
    setApkMessage("");
    setApkDownloadUrl("");
    setApkPageUrl("");
    setApkQrUrl("");
    setApkQrCandidates([]);
    setApkInstallState({ busy: false, message: "" });
    setApkLinkExpiresAt("");
    setApkReleaseSigned(false);
    setApkMobileReachable(null);
    setShowApkModal(false);
    setApkCodeHash("");
    setApkLoading(false);
  }, [displayedCode, projectId]);

  const prepareApkInBackground = async (codeToBuild, { announce = false } = {}) => {
    if (!codeToBuild || !String(codeToBuild).trim()) return null;

    const generation = ++apkPollGenerationRef.current;
    setApkLoading(true);
    setApkStatus("queued");
    setApkProgress(0);
    setApkMessage("Preparing APK in background…");

    try {
      let data = await prepareApk(codeToBuild, projectId);
      if (generation !== apkPollGenerationRef.current) return null;

      setApkJobId(data.jobId || "");
      setApkCodeHash(data.codeHash || "");
      setApkStatus(data.status || "queued");
      setApkProgress(Number(data.progress || 0));
      setApkMessage(data.message || "Preparing APK…");

      while (data.jobId && ["queued", "building"].includes(data.status)) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (generation !== apkPollGenerationRef.current) return null;
        data = await getApkStatus(data.jobId);
        if (generation !== apkPollGenerationRef.current) return null;

        setApkStatus(data.status || "building");
        setApkProgress(Number(data.progress || 0));
        setApkMessage(data.message || "Building APK…");
      }

      if (generation !== apkPollGenerationRef.current) return null;

      if (data.status === "ready") {
        setApkProgress(100);
        setApkMessage(data.releaseSigned ? "Signed release APK ready." : "Release APK ready with development signing.");
        setApkReleaseSigned(Boolean(data.releaseSigned));
        if (announce) setNotice(data.cached ? "APK was already prepared and is ready." : "APK is ready to download.");
      } else if (["failed", "expired", "cancelled"].includes(data.status)) {
        setApkDownloadUrl("");
        if (announce) setError(data.message || "APK build failed.");
      }

      return data;
    } catch (err) {
      if (generation === apkPollGenerationRef.current) {
        setApkStatus("failed");
        setApkMessage(err.message || "APK build failed.");
        if (announce) setError(err.message || "APK build failed.");
      }
      return null;
    } finally {
      if (generation === apkPollGenerationRef.current) setApkLoading(false);
    }
  };

  /* ── Chat edit (Submit new prompt) ─────────────────────────────────────── */
  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || updating) return;

    const currentMsg = message;
    setMessage("");
    setUpdating(true);
    setError("");
    setNotice("");

    try {
      const res = await updateProjectChat(projectId, currentMsg, selectedVersion);
      setProject(res.project);
      setSelectedVersion(null);

      if (res.alreadyApplied) {
        setNotice(res.message || "This change is already applied to your app.");
        return;
      }

      setNotice("New version generated successfully!");

      // Build a new isolated preview version, then retire the old session only
      // after the replacement is ready. This prevents users from affecting each other.
      if (previewUrl) {
        const previousSessionId = previewSessionId;
        setIsHotReloading(true);
        setNotice("Building updated preview…");
        try {
          const d = await runWebPreview(
            res.project.currentCode,
            projectId,
            (status) => setBuildStatus(status.message || "Building updated preview…")
          );
          setPreviewSessionId(d.sessionId);
          setPreviewUrl(d.previewUrl || d.url || previewUrl);
          setMobileUrl(d.mobilePreviewUrl || d.qrPayload || "");
          setMobileCandidates(d.mobilePreviewCandidates || []);
          setPreviewKey(Date.now());
          setNotice("Updated preview is ready.");
          prepareApkInBackground(res.project.currentCode).catch(() => {});

          if (previousSessionId && previousSessionId !== d.sessionId) {
            stopWebPreview(previousSessionId).catch(() => {});
          }
        } catch (reloadErr) {
          console.warn("Preview rebuild warning:", reloadErr);
          setNotice("Code updated. Click 'Run preview' to build the new preview.");
        } finally {
          setBuildStatus("");
          setIsHotReloading(false);
        }
      }
    } catch (err) {
      setError(err.message);
      setMessage(currentMsg);
    } finally {
      setUpdating(false);
      setTimeout(() => {
        threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const restoreSelectedVersion = async () => {
    if (!selectedVersion || updating) return;
    const versionToRestore = selectedVersion;
    setUpdating(true);
    setError("");
    setNotice("");
    try {
      const res = await restoreProjectVersion(projectId, versionToRestore);
      setProject(res.project);
      setSelectedVersion(null);
      setNotice(res.message || `Version ${versionToRestore} restored as a new version.`);

      if (previewSessionId) {
        stopWebPreview(previewSessionId).catch(() => {});
        setPreviewSessionId("");
        setPreviewUrl("");
        setMobileUrl("");
        setMobileCandidates([]);
      }
    } catch (err) {
      setError(err.message || "Could not restore this version.");
    } finally {
      setUpdating(false);
    }
  };

  /* ── Web preview ────────────────────────────────────────────────────────── */
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
      const data = await runWebPreview(
        displayedCode,
        projectId,
        (status) => {
          const progress = Number.isFinite(status.progress) ? ` (${status.progress}%)` : "";
          setBuildStatus(`${status.message || "Building preview…"}${progress}`);
        }
      );

      setPreviewSessionId(data.sessionId);
      setPreviewUrl(data.previewUrl || data.url || "");
      setMobileUrl(data.mobilePreviewUrl || data.qrPayload || "");
      setMobileCandidates(data.mobilePreviewCandidates || []);
      setPreviewKey(Date.now());
      setActiveTab("preview");
      setNotice(data.message || "Preview ready.");
      // Start Android packaging after the validated web preview is ready. This
      // removes APK compilation from the later Download click.
      prepareApkInBackground(displayedCode).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildStatus("");
      setPreviewLoading(false);
    }
  };

  /* ── Rebuild Preview ─────────────────────────────────────────────────────── */
  const reloadPreview = async () => {
    if (!previewUrl) {
      return runPreview();
    }

    const previousSessionId = previewSessionId;
    setIsHotReloading(true);
    setError("");
    setNotice("Building a fresh isolated preview…");

    try {
      const d = await runWebPreview(
        displayedCode,
        projectId,
        (status) => setBuildStatus(status.message || "Building preview…")
      );

      setPreviewSessionId(d.sessionId);
      setPreviewUrl(d.previewUrl || d.url || "");
      setMobileUrl(d.mobilePreviewUrl || d.qrPayload || "");
      setPreviewKey(Date.now());
      setNotice("Preview rebuilt successfully.");
      prepareApkInBackground(displayedCode).catch(() => {});

      if (previousSessionId && previousSessionId !== d.sessionId) {
        stopWebPreview(previousSessionId).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildStatus("");
      setIsHotReloading(false);
    }
  };

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
        data = await runWebPreview(
          displayedCode,
          projectId,
          (status) => {
            const progress = Number.isFinite(status.progress) ? ` (${status.progress}%)` : "";
            setBuildStatus(`${status.message || "Building preview…"}${progress}`);
          }
        );

        setPreviewSessionId(data.sessionId);
        setPreviewUrl(data.previewUrl || data.url || "");
        setPreviewKey(Date.now());
        setActiveTab("preview");
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

  const openApkDownload = async () => {
    if (!apkJobId) return;
    try {
      const link = await createApkDownloadLink(apkJobId);
      const pageUrl = resolveApiAssetUrl(link.pageUrl || link.pagePath);
      const fileUrl = resolveApiAssetUrl(link.fileUrl || link.filePath);
      setApkPageUrl(pageUrl);
      setApkDownloadUrl(fileUrl);
      setApkQrUrl(link.qrUrl || pageUrl);
      setApkQrCandidates(link.qrCandidates || []);
      setApkLinkExpiresAt(link.expiresAt || "");
      setApkReleaseSigned(Boolean(link.releaseSigned));
      setApkMobileReachable(link.mobileReachable ?? null);
      setShowApkModal(true);
    } catch (err) {
      setError(err.message || "Could not create a secure APK download link.");
    }
  };

  const installReadyApk = async () => {
    if (!apkJobId) return;
    setApkInstallState({ busy: true, message: "Checking connected Android devices…" });
    try {
      const devices = await getApkDevices();
      const installable = devices.installableDevices || [];
      if (!installable.length) {
        const blocked = (devices.unauthorizedDevices || []).length
          ? "Phone detected but USB debugging is unauthorized. Unlock the phone and tap Allow."
          : (devices.offlineDevices || []).length
          ? "Android device is offline. Reconnect USB/ADB and retry."
          : "No Android device is visible to ADB. Connect a phone with USB debugging or start an emulator.";
        throw new Error(blocked);
      }
      const preferred = installable.find((item) => !item.isEmulator) || installable[0];
      setApkInstallState({ busy: true, message: `Installing on ${preferred.id}…` });
      const result = await installApkOnDevice(apkJobId, preferred.id);
      setApkInstallState({ busy: false, message: result.message || "APK installed successfully." });
      setNotice(result.message || "APK installed successfully.");
    } catch (err) {
      setApkInstallState({ busy: false, message: err.message || "APK install failed." });
      setError(err.message || "APK install failed.");
    }
  };

  const makeApk = async () => {
    setError("");
    setNotice("");

    if (apkStatus === "ready" && apkJobId) {
      await openApkDownload();
      return;
    }

    if (["queued", "building"].includes(apkStatus)) {
      setNotice(apkMessage || "APK is already being prepared in the background.");
      return;
    }

    setNotice("Release APK preparation started in the background. You can keep using the studio.");
    prepareApkInBackground(displayedCode, { announce: true });
  };

  const exportProject = async () => {
    setError("");
    try {
      await downloadProjectExport(projectId);
      setNotice("Project ZIP download started.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyCode = () => {
    const textToCopy = codeFile === "schema.sql" ? currentTableSql : displayedCode;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setNotice(codeFile === "schema.sql" ? "⚡ Supabase SQL copied to clipboard!" : "Dart code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    if (codeFile === "schema.sql") {
      const blob = new Blob([currentTableSql], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.supabaseTable || "schema"}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      handleDownloadDart();
    }
  };

  const handleDownloadDart = () => {
    const blob = new Blob([displayedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.dart";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isGenerating = previewLoading || updating;

  useEffect(() => {
    if (activeTab !== "preview" || isGenerating || !project) return undefined;

    const stage = stageRef.current;
    if (!stage) return undefined;

    const updateDeviceScale = () => {
      const size = DEVICE_FRAME_SIZES[device] || DEVICE_FRAME_SIZES.iphone;
      const styles = window.getComputedStyle(stage);
      const horizontalPadding =
        (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const verticalPadding =
        (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);

      const availableWidth = Math.max(1, stage.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, stage.clientHeight - verticalPadding);
      const nextScale = Math.min(
        1,
        availableWidth / size.outerWidth,
        availableHeight / size.outerHeight
      );

      // Keep the complete device visible. The iframe itself still renders at
      // the unscaled viewport dimensions, so Flutter responsive breakpoints are exact.
      setDeviceScale(Math.max(0.25, nextScale));
    };

    updateDeviceScale();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateDeviceScale) : null;
    observer?.observe(stage);
    window.addEventListener("resize", updateDeviceScale);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateDeviceScale);
    };
  }, [device, activeTab, isGenerating, project]);

  if (loading) {
    return (
      <main className="studio-page">
        <div className="studio-stage">
          <div className="studio-tips-wrapper">
            <span className="studio-tips-spinner" />
            <p style={{ marginTop: 12, color: "var(--muted)" }}>Loading project studio…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="studio-page">
        <div className="studio-stage">
          <div className="form-error">{error || "Project not found"}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="studio-page">
      {/* ── TOP HEADER BAR ── */}
      <header className="studio-header">
        <div className="studio-header-left">
          <Link
            to="/dashboard"
            className="studio-back-btn"
            aria-label="Back to start"
            onClick={() => previewSessionId && stopWebPreview(previewSessionId).catch(() => {})}
          >
            <FiArrowLeft />
            <span>Back to start</span>
          </Link>

          <div className="studio-header-center">
            <h1 className="studio-title" title={project.title}>
              {project.title}
            </h1>
            <span className="studio-version-pill">
              v{selectedVersion || project.version || 1}
            </span>

            {isSupabaseProject && (
              <button
                type="button"
                className="studio-supabase-btn"
                onClick={() => setShowSupabaseModal(true)}
                title="View Supabase configuration & SQL schema"
              >
                <span className="studio-supabase-btn-dot" />
                <FiZap /> Supabase SQL & DB
              </button>
            )}
          </div>
        </div>

        <div className="studio-header-right">
          <button
            type="button"
            className="studio-action-pill"
            onClick={exportProject}
            disabled={!displayedCode}
            title="Download full project ZIP"
          >
            <FiDownload />
            <span>Export ZIP</span>
          </button>

          <button
            type="button"
            className="studio-action-pill"
            onClick={makeMobilePreview}
            disabled={!displayedCode || previewLoading}
            title="Scan QR to preview on real phone"
          >
            <FiSmartphone />
            <span>Mobile QR</span>
          </button>

          <button
            type="button"
            className={`studio-action-pill ${previewUrl ? "active-preview" : "primary"}`}
            onClick={runPreview}
            disabled={previewLoading || !displayedCode}
            title={previewUrl ? "Stop live web preview" : "Compile and run interactive preview"}
          >
            {previewLoading ? (
              <>
                <span className="studio-tips-spinner" />
                <span>{buildStatus || "Compiling…"}</span>
              </>
            ) : previewUrl ? (
              <>
                <FiSquare />
                <span>Stop preview</span>
              </>
            ) : (
              <>
                <FiPlay />
                <span>Run preview</span>
              </>
            )}
          </button>

          <button
            type="button"
            className={`studio-action-pill ${apkStatus === "ready" ? "apk-ready-pill" : ""}`}
            onClick={makeApk}
            disabled={!displayedCode}
            title={
              apkStatus === "ready"
                ? "Open secure APK download and QR"
                : ["queued", "building"].includes(apkStatus)
                ? apkMessage || "APK is being prepared in the background"
                : "Prepare installable Android release APK"
            }
          >
            {apkStatus === "ready" ? <FiDownload /> : <FiCpu />}
            <span>
              {apkStatus === "ready"
                ? "Download APK"
                : ["queued", "building"].includes(apkStatus)
                ? `Preparing APK${apkProgress ? ` ${apkProgress}%` : "…"}`
                : apkStatus === "failed"
                ? "Retry APK"
                : "Prepare APK"}
            </span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {(notice || error) && (
        <div
          className={`studio-feedback ${error ? "is-error" : "is-success"}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          <span>{error || notice}</span>
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
            aria-label="Dismiss message"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* ── TWO-COLUMN WORKSPACE ── */}
      <div className="studio-workspace">
        {/* ================================================================
            LEFT COLUMN: PROMPT STREAM & CONVERSATION
            ================================================================ */}
        <aside className="studio-left-col">
          <div className="studio-left-header">
            <div className="studio-model-badge">
              <span className="studio-sparkle-icon">✦</span>
              <span>VibeApp AI</span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>
                • Flutter Engine
              </span>
            </div>

            {selectedVersion && (
              <button
                type="button"
                className="studio-return-latest-btn"
                onClick={() => setSelectedVersion(null)}
              >
                <FiRotateCcw style={{ verticalAlign: "middle", marginRight: 4 }} />
                Latest
              </button>
            )}
          </div>

          {/* Historical notice */}
          {selectedVersion && (
            <div className="studio-historical-notice">
              <span>Viewing Version {selectedVersion}</span>
              <div className="studio-historical-actions">
                {selectedVersion !== project.version && (
                  <button
                    type="button"
                    className="studio-restore-version-btn"
                    onClick={restoreSelectedVersion}
                    disabled={updating}
                  >
                    <FiRotateCcw /> Restore as new version
                  </button>
                )}
                <button
                  type="button"
                  className="studio-return-latest-btn"
                  onClick={() => setSelectedVersion(null)}
                >
                  Back to latest
                </button>
              </div>
            </div>
          )}

          {selectedVersion && versionDiff?.available && (
            <div className="studio-version-diff">
              <strong>{versionDiff.summary}</strong>
              {(versionDiff.changes || []).slice(0, 8).map((change, index) => (
                <span key={`${change.area}-${change.id}-${index}`} className={`diff-${change.type}`}>
                  {change.type === "added" ? "+" : change.type === "removed" ? "−" : "~"} {change.label || change.id}
                </span>
              ))}
            </div>
          )}

          {/* ── Supabase Setup Banner ── */}
          {isSupabaseProject && (
            <div className="studio-supabase-banner">
              <div className="studio-supabase-banner-header">
                <div className="studio-supabase-banner-title">
                  <span className="studio-supabase-indicator" />
                  <FiZap className="studio-zap-icon" />
                  <span>Table: <code>{displayedTableName}</code></span>
                </div>
                <button
                  type="button"
                  className="studio-supabase-banner-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(currentTableSql);
                    setNotice("⚡ SQL copied! Paste in your Supabase SQL Editor.");
                  }}
                  title="Copy SQL for Supabase SQL Editor"
                >
                  <FiCopy /> Copy SQL
                </button>
              </div>
              <p className="studio-supabase-banner-desc">
                Paste SQL in your <strong>Supabase SQL Editor</strong> to create table & policies.
              </p>
              <div className="studio-supabase-banner-actions">
                <button
                  type="button"
                  className="studio-supabase-banner-link"
                  onClick={() => {
                    setActiveTab("code");
                    setCodeFile("schema.sql");
                  }}
                >
                  <FiCode /> Inspect SQL
                </button>
                <button
                  type="button"
                  className="studio-supabase-banner-link"
                  onClick={() => setShowSupabaseModal(true)}
                >
                  <FiZap /> Config & Keys
                </button>
                <a
                  href="https://supabase.com/dashboard/project/_/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="studio-supabase-banner-link"
                  title="Open Supabase SQL Editor"
                >
                  <FiExternalLink /> Supabase Dashboard
                </a>
              </div>
            </div>
          )}

          {/* Prompt list */}
          <div className="studio-thread">
            {versionList.map((v) => {
              const isSelected = selectedVersion === v.version || (!selectedVersion && v.version === (project.version || 1));
              return (
                <div
                  key={`${v.version}-${v.createdAt}`}
                  className={`studio-prompt-card ${isSelected ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedVersion(v.version);
                    setActiveTab("code");
                  }}
                  title="Click to inspect this prompt's code & preview"
                >
                  <div className="studio-prompt-card-header">
                    <span className="studio-card-version-tag">
                      Version {v.version}
                    </span>
                    {isSelected && (
                      <span className="studio-card-active-badge">
                        ✦ Active
                      </span>
                    )}
                  </div>

                  <p className="studio-prompt-text">{v.prompt}</p>

                  <div className="studio-card-footer">
                    <span>{v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Initial"}</span>
                    <div className="studio-card-footer-actions">
                      <span className="studio-card-action-hint">
                        <FiCode /> Code
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={threadBottomRef} />
          </div>

          {/* Bottom input bar */}
          <div className="studio-input-container">
            {showChips && (
              <div className="studio-quick-chips">
                {QUICK_PROMPTS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="studio-chip-btn"
                    onClick={() => {
                      setMessage(chip);
                      setShowChips(false);
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            )}

            <form className="studio-input-box" onSubmit={submit}>
              <textarea
                className="studio-prompt-textarea"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Make changes, add new features, ask for anything"
                disabled={updating}
              />

              <div className="studio-input-actions">
                <div className="studio-input-actions-left">
                  <button
                    type="button"
                    className="studio-icon-btn"
                    onClick={() => setShowChips((v) => !v)}
                    title="Quick prompt suggestions"
                  >
                    <FiPlus />
                  </button>
                  <button
                    type="button"
                    className="studio-icon-btn"
                    title="Voice input (coming soon)"
                    onClick={() => setNotice("Voice input ready on supported devices.")}
                  >
                    <FiMic />
                  </button>
                </div>

                <div className="studio-input-actions-right">
                  <button
                    type="submit"
                    className="studio-submit-btn"
                    disabled={!message.trim() || updating}
                    title="Send prompt"
                  >
                    {updating ? (
                      <span className="studio-tips-spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      <FiArrowUp />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </aside>

        {/* ================================================================
            RIGHT COLUMN: PREVIEW & CODE STUDIO
            ================================================================ */}
        <section className="studio-right-col">
          {/* Right Toolbar */}
          <div className="studio-toolbar">
            {/* Segmented Tab: Preview vs Code */}
            <div className="studio-segmented-tabs">
              <button
                type="button"
                className={`studio-segmented-btn ${activeTab === "preview" ? "is-active" : ""}`}
                onClick={() => setActiveTab("preview")}
              >
                <span className="studio-segmented-dot" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                className={`studio-segmented-btn ${activeTab === "code" ? "is-active" : ""}`}
                onClick={() => setActiveTab("code")}
              >
                <FiCode />
                <span>Code</span>
              </button>
            </div>

            {/* Device Switcher */}
            <div className="studio-device-switcher">
              <button
                type="button"
                className={`studio-device-btn ${device === "iphone" ? "is-active" : ""}`}
                onClick={() => setDevice("iphone")}
                title="iPhone (iOS)"
              >
                <FiSmartphone />
                <span>iPhone</span>
              </button>
              <button
                type="button"
                className={`studio-device-btn ${device === "android" ? "is-active" : ""}`}
                onClick={() => setDevice("android")}
                title="Android Phone"
              >
                <FiSmartphone />
                <span>Android</span>
              </button>
              <button
                type="button"
                className={`studio-device-btn ${device === "tablet" ? "is-active" : ""}`}
                onClick={() => setDevice("tablet")}
                title="Tablet / iPad"
              >
                <FiTablet />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                className={`studio-device-btn ${device === "desktop" ? "is-active" : ""}`}
                onClick={() => setDevice("desktop")}
                title="Responsive Desktop"
              >
                <FiMonitor />
                <span>Desktop</span>
              </button>
            </div>

            {/* Utility Tools */}
            <div className="studio-toolbar-tools">
              <button
                type="button"
                className={`studio-tool-btn ${isHotReloading ? "is-reloading" : ""}`}
                onClick={reloadPreview}
                title={previewUrl ? "Hot restart preview" : "Run preview"}
                disabled={isHotReloading}
              >
                <FiRefreshCw className={isHotReloading ? "spin-icon" : ""} />
              </button>

              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="studio-tool-btn"
                  title="Open preview in new window"
                >
                  <FiExternalLink />
                </a>
              )}

              <button
                type="button"
                className="studio-tool-btn"
                onClick={makeMobilePreview}
                title="Open Mobile QR Code"
              >
                <FiShare2 />
              </button>

              <button
                type="button"
                className="studio-tool-btn"
                onClick={exportProject}
                title="Export ZIP"
              >
                <FiDownload />
              </button>
            </div>
          </div>

          {/* Right Main Stage */}
          <div
            className={`studio-stage ${activeTab === "preview" && !isGenerating ? "is-device-preview" : ""} ${activeTab === "preview" && !isGenerating && device === "desktop" ? "is-desktop-preview" : ""}`}
            ref={stageRef}
          >
            {/* 1. If currently compiling / updating -> Show Google AI Studio style Tips Carousel */}
            {isGenerating ? (
              <div className="studio-tips-wrapper">
                <span className="studio-tips-kicker">
                  <span className="studio-tips-spinner" />
                  Generating app
                </span>
                <h2 className="studio-tips-headline">Enjoy these tips while you wait</h2>

                <div className="studio-carousel-stage">
                  <button
                    type="button"
                    className="studio-carousel-arrow"
                    onClick={() =>
                      setTipIndex((prev) => (prev === 0 ? TIPS.length - 1 : prev - 1))
                    }
                    aria-label="Previous tip"
                  >
                    <FiChevronLeft />
                  </button>

                  <div className="studio-carousel-card">
                    <span className="studio-tip-icon">{TIPS[tipIndex].icon}</span>
                    <h3 className="studio-tip-title">{TIPS[tipIndex].title}</h3>
                    <p className="studio-tip-desc">{TIPS[tipIndex].desc}</p>
                  </div>

                  <button
                    type="button"
                    className="studio-carousel-arrow"
                    onClick={() => setTipIndex((prev) => (prev + 1) % TIPS.length)}
                    aria-label="Next tip"
                  >
                    <FiChevronRight />
                  </button>
                </div>

                <div className="studio-carousel-dots">
                  {TIPS.map((_, i) => (
                    <span
                      key={i}
                      className={`studio-dot ${i === tipIndex ? "is-active" : ""}`}
                      onClick={() => setTipIndex(i)}
                    />
                  ))}
                </div>
              </div>
            ) : activeTab === "preview" ? (
              /* 2. PREVIEW MODE -> exact viewport rendered inside a scaled visual shell */
              <div
                className={`device-fit-shell ${device === "desktop" ? "is-desktop" : ""}`}
                style={
                  device === "desktop"
                    ? undefined
                    : {
                        width: `${DEVICE_FRAME_SIZES[device].outerWidth * deviceScale}px`,
                        height: `${DEVICE_FRAME_SIZES[device].outerHeight * deviceScale}px`,
                      }
                }
              >
                <div
                  className={`device-frame-${device}`}
                  style={
                    device === "desktop"
                      ? undefined
                      : {
                          transform: `scale(${deviceScale})`,
                          transformOrigin: "top left",
                        }
                  }
                >
                {device === "iphone" && (
                  <>
                    <div className="device-notch-island" />
                    <div className="device-status-bar">
                      <span>9:41</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <i /> <i /> <i />
                      </span>
                    </div>
                  </>
                )}

                {device === "android" && (
                  <>
                    <div className="device-hole-punch" />
                    <div className="device-status-bar">
                      <span>12:00</span>
                      <span>5G 98%</span>
                    </div>
                  </>
                )}

                {device === "desktop" && (
                  <div className="device-browser-bar">
                    <span className="device-browser-dots">
                      <i /> <i /> <i />
                    </span>
                    <span className="device-browser-url">
                      https://vibeapp.local/preview/{projectId}
                    </span>
                  </div>
                )}

                {/* If live web preview is running, render iframe; otherwise render interactive idle state */}
                {previewUrl ? (
                  <div className="device-screen-wrapper">
                    {isHotReloading && (
                      <div className="hot-reload-overlay">
                        <span className="studio-tips-spinner" />
                        <span>⚡ Hot-reloading app…</span>
                      </div>
                    )}
                    <iframe
                      key={previewKey}
                      title="Flutter Web Preview"
                      src={`${previewUrl}${previewUrl.includes("?") ? "&" : "?"}_t=${previewKey}`}
                      className="device-screen-iframe"
                    />
                  </div>
                ) : (
                  <div className="device-idle-screen">
                    <div className="device-idle-logo">V</div>
                    <h3 className="device-idle-title">{project.title}</h3>
                    <p className="device-idle-prompt">{displayedPrompt}</p>

                    <div className="device-idle-actions">
                      <button
                        type="button"
                        className="device-idle-btn primary"
                        onClick={runPreview}
                      >
                        <FiPlay /> Run Live Preview
                      </button>

                      <button
                        type="button"
                        className="device-idle-btn secondary"
                        onClick={makeMobilePreview}
                      >
                        <FiSmartphone /> Scan on Real Phone
                      </button>

                      <button
                        type="button"
                        className="device-idle-btn secondary"
                        onClick={() => setActiveTab("code")}
                      >
                        <FiCode /> Inspect Dart Code
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            ) : (
              /* 3. CODE MODE -> CODE STUDIO */
              <div className="studio-code-container">
                <div className="studio-code-header">
                  <div className="studio-code-file-tabs">
                    <button
                      type="button"
                      className={`studio-code-file-tab ${codeFile === "main.dart" ? "is-active" : ""}`}
                      onClick={() => setCodeFile("main.dart")}
                    >
                      <FiCode />
                      <span>lib/main.dart</span>
                      <span className="studio-code-file-meta">
                        ({displayedCode.split("\n").length} lines)
                      </span>
                    </button>

                    {isSupabaseProject && (
                      <button
                        type="button"
                        className={`studio-code-file-tab supabase-file-tab ${codeFile === "schema.sql" ? "is-active" : ""}`}
                        onClick={() => setCodeFile("schema.sql")}
                      >
                        <FiZap className="tab-zap" />
                        <span>schema.sql</span>
                        <span className="studio-code-file-badge">Supabase</span>
                      </button>
                    )}
                  </div>

                  <div className="studio-code-actions">
                    {selectedVersion && codeFile === "main.dart" && (
                      <button
                        type="button"
                        className="studio-code-btn"
                        onClick={() => setSelectedVersion(null)}
                      >
                        <FiRotateCcw /> Return to latest
                      </button>
                    )}

                    <button
                      type="button"
                      className="studio-code-btn"
                      onClick={handleCopyCode}
                    >
                      {copiedCode ? <FiCheck style={{ color: "var(--teal)" }} /> : <FiCopy />}
                      <span>{copiedCode ? "Copied" : codeFile === "schema.sql" ? "Copy SQL" : "Copy Code"}</span>
                    </button>

                    <button
                      type="button"
                      className="studio-code-btn"
                      onClick={handleDownloadCode}
                    >
                      <FiDownload />
                      <span>{codeFile === "schema.sql" ? "Download .sql" : "Download .dart"}</span>
                    </button>
                  </div>
                </div>

                <pre className="studio-code-pre">
                  <code>{codeFile === "schema.sql" ? currentTableSql : displayedCode}</code>
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── MOBILE QR MODAL ── */}
      <ApkDownloadModal
        open={showApkModal}
        onClose={() => setShowApkModal(false)}
        pageUrl={apkPageUrl}
        qrUrl={apkQrUrl}
        qrCandidates={apkQrCandidates}
        fileUrl={apkDownloadUrl}
        expiresAt={apkLinkExpiresAt}
        releaseSigned={apkReleaseSigned}
        mobileReachable={apkMobileReachable}
        onInstall={installReadyApk}
        installState={apkInstallState}
      />

      <MobileQRModal
        url={mobileUrl}
        candidates={mobileCandidates}
        open={showQR}
        onClose={() => setShowQR(false)}
      />

      {/* ── SUPABASE CREDENTIALS & SQL MODAL ── */}
      {showSupabaseModal && (
        <div className="studio-modal-overlay" onClick={() => setShowSupabaseModal(false)}>
          <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="studio-modal-header">
              <h3>
                <FiZap /> Supabase Configuration
              </h3>
              <button
                type="button"
                className="studio-modal-close"
                onClick={() => setShowSupabaseModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="supabase-info-grid" style={{ marginBottom: 16 }}>
              <div className="supabase-info-item">
                <small>Project URL</small>
                <code>{project.supabaseUrl || "—"}</code>
              </div>
              <div className="supabase-info-item">
                <small>Table Name</small>
                <code>{project.supabaseTable || "—"}</code>
              </div>
            </div>

            <div className="supabase-sql-block">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--teal-light)", fontWeight: 600 }}>
                  PostgreSQL Table Migration Script
                </span>
                <button
                  type="button"
                  className="copy-sql-button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentTableSql);
                    setNotice("⚡ SQL copied to clipboard!");
                  }}
                >
                  <FiCopy /> Copy SQL
                </button>
              </div>
              <pre>
                <code>{currentTableSql}</code>
              </pre>
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <a
                href="https://supabase.com/dashboard/project/_/sql"
                target="_blank"
                rel="noreferrer"
                className="studio-action-pill"
                style={{ fontSize: "0.78rem" }}
              >
                <FiExternalLink /> Open Supabase SQL Editor
              </a>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
