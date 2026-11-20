import { FiCpu, FiDownload } from "react-icons/fi";

const isBuilding = (status) => ["queued", "building"].includes(status);

export default function ApkButton({
  status,
  progress,
  message,
  disabled,
  onClick,
  className = "studio-action-pill",
}) {
  const title =
    status === "ready"
      ? "Open secure APK download and QR"
      : isBuilding(status)
      ? message || "APK is being prepared in the background"
      : "Prepare installable Android release APK";

  const label =
    status === "ready"
      ? "Download APK"
      : isBuilding(status)
      ? `Preparing APK${progress ? ` ${progress}%` : "…"}`
      : status === "failed"
      ? "Retry APK"
      : "Prepare APK";

  return (
    <button
      type="button"
      className={`${className} ${status === "ready" ? "apk-ready-pill" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
    >
      {status === "ready" ? <FiDownload /> : <FiCpu />}
      <span>{label}</span>
    </button>
  );
}
