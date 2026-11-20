import { FiPlay, FiSmartphone } from "react-icons/fi";

import { DEVICE_FRAME_SIZES } from "../constants";
import "./DeviceFrame.css";

/** Notch / status bar / browser bar for the selected device. */
function DeviceChrome({ device, projectId }) {
  if (device === "iphone") {
    return (
      <>
        <div className="device-notch-island" />
        <div className="device-status-bar">
          <span>9:41</span>
          <span className="device-status-icons">
            <i /> <i /> <i />
          </span>
        </div>
      </>
    );
  }

  if (device === "android") {
    return (
      <>
        <div className="device-hole-punch" />
        <div className="device-status-bar">
          <span>12:00</span>
          <span>5G 98%</span>
        </div>
      </>
    );
  }

  if (device === "desktop") {
    return (
      <div className="device-browser-bar">
        <span className="device-browser-dots">
          <i /> <i /> <i />
        </span>
        <span className="device-browser-url">https://vibeapp.local/preview/{projectId}</span>
      </div>
    );
  }

  return null;
}

/** Shown when no live preview is running yet. */
function IdleScreen({ title, prompt, onRunPreview, onMobileQR }) {
  return (
    <div className="device-idle-screen">
      <div className="device-idle-logo">V</div>
      <h3 className="device-idle-title">{title}</h3>
      <p className="device-idle-prompt">{prompt}</p>

      <div className="device-idle-actions">
        <button type="button" className="device-idle-btn primary" onClick={onRunPreview}>
          <FiPlay /> Run Live Preview
        </button>
        <button type="button" className="device-idle-btn secondary studio-hide-mobile" onClick={onMobileQR}>
          <FiSmartphone /> Scan on Real Phone
        </button>
      </div>
    </div>
  );
}

/**
 * device = "iphone" | "android" | "tablet" | "desktop" -> frame ke saath
 * device = "bare" (phones) -> sirf screen, poori stage ko bharti hai
 */
export default function DeviceFrame({
  device,
  scale,
  projectId,
  title,
  prompt,
  previewUrl,
  previewKey,
  isHotReloading,
  onRunPreview,
  onMobileQR,
}) {
  const screen = previewUrl ? (
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
    <IdleScreen title={title} prompt={prompt} onRunPreview={onRunPreview} onMobileQR={onMobileQR} />
  );

  if (device === "bare") {
    return <div className="device-bare-shell">{screen}</div>;
  }

  const isDesktop = device === "desktop";
  const size = DEVICE_FRAME_SIZES[device];

  return (
    <div
      className={`device-fit-shell ${isDesktop ? "is-desktop" : ""}`}
      style={
        isDesktop
          ? undefined
          : { width: `${size.outerWidth * scale}px`, height: `${size.outerHeight * scale}px` }
      }
    >
      <div
        className={`device-frame-${device}`}
        style={isDesktop ? undefined : { transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <DeviceChrome device={device} projectId={projectId} />
        {screen}
      </div>
    </div>
  );
}
