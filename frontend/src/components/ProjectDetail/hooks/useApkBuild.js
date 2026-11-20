import { useEffect, useRef, useState } from "react";

import {
  getApkStatus,
  prepareApk,
  createApkDownloadLink,
  getApkDevices,
  installApkOnDevice,
  resolveApiAssetUrl,
} from "../../../api/previewApi";

/**
 * Everything about the Android APK: background build + polling, secure
 * download link/QR modal, and install on a connected device.
 * `code` is the code currently displayed — APK artifacts belong to that exact code.
 */
export default function useApkBuild({ projectId, code, setError, setNotice }) {
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
  }, [code, projectId]);

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
    prepareApkInBackground(code, { announce: true });
  };

  return {
    apkStatus,
    apkProgress,
    apkMessage,
    apkDownloadUrl,
    apkPageUrl,
    apkQrUrl,
    apkQrCandidates,
    apkInstallState,
    apkLinkExpiresAt,
    apkReleaseSigned,
    apkMobileReachable,
    showApkModal,
    closeApkModal: () => setShowApkModal(false),
    prepareApkInBackground,
    makeApk,
    installReadyApk,
  };
}
