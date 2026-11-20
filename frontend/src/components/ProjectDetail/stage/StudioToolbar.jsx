import {
  FiCode,
  FiExternalLink,
  FiMonitor,
  FiRefreshCw,
  FiSmartphone,
  FiTablet,
} from "react-icons/fi";

import "./StudioToolbar.css";

const DEVICES = [
  { id: "iphone", label: "iPhone", title: "iPhone (iOS)", Icon: FiSmartphone },
  { id: "android", label: "Android", title: "Android Phone", Icon: FiSmartphone },
  { id: "tablet", label: "Tablet", title: "Tablet / iPad", Icon: FiTablet },
  { id: "desktop", label: "Desktop", title: "Responsive Desktop", Icon: FiMonitor },
];

export default function StudioToolbar({
  activeTab,
  setActiveTab,
  device,
  setDevice,
  previewUrl,
  isHotReloading,
  onReload,
}) {
  return (
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
        {DEVICES.map(({ id, label, title, Icon }) => (
          <button
            key={id}
            type="button"
            className={`studio-device-btn ${device === id ? "is-active" : ""}`}
            onClick={() => setDevice(id)}
            title={title}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Utility Tools */}
      <div className="studio-toolbar-tools">
        <button
          type="button"
          className={`studio-tool-btn ${isHotReloading ? "is-reloading" : ""}`}
          onClick={onReload}
          title={previewUrl ? "Hot restart preview" : "Run preview"}
          aria-label={previewUrl ? "Hot restart preview" : "Run preview"}
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
            aria-label="Open preview in new window"
          >
            <FiExternalLink />
          </a>
        )}
      </div>
    </div>
  );
}
