import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiDownload, FiSmartphone, FiX, FiZap } from "react-icons/fi";

import ApkButton from "./ApkButton";
import "./HeaderMenu.css";

const BUILDING = ["queued", "building"];

/**
 * Responsive Header Actions:
 * - Wide desktop: Primary actions (Export, APK) visible inline + "More" dropdown for extras
 * - Tablet & Mobile: Clear labeled pill ("Export / APK ▾") opening a dropdown / bottom sheet
 */
export default function HeaderMenu({
  disabled,
  previewLoading,
  isSupabaseProject,
  apk,
  onExport,
  onMobileQR,
  onOpenSupabase,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (fn) => () => {
    setOpen(false);
    fn();
  };

  const isBuilding = BUILDING.includes(apk.apkStatus);
  const isReady = apk.apkStatus === "ready";

  const badgeClass = isBuilding ? "is-building" : isReady ? "is-ready" : "";

  // Dynamic label so user immediately sees APK progress or available actions
  const triggerLabel = isBuilding
    ? `APK ${apk.apkProgress ? `${apk.apkProgress}%` : "Building..."}`
    : isReady
    ? "APK Ready"
    : "Export / APK";

  return (
    <div className="studio-actions-group" ref={rootRef}>
      {/* ── Wide Desktop: Inline Primary Actions ── */}
      <div className="studio-inline-actions">
        <button
          type="button"
          className="studio-inline-btn"
          onClick={onExport}
          disabled={disabled}
          title="Download Flutter source code as ZIP"
        >
          <FiDownload />
          <span>Export ZIP</span>
        </button>

        <ApkButton
          className="studio-inline-btn studio-inline-apk"
          status={apk.apkStatus}
          progress={apk.apkProgress}
          message={apk.apkMessage}
          disabled={disabled}
          onClick={apk.makeApk}
        />

        {isSupabaseProject && (
          <button
            type="button"
            className="studio-inline-btn studio-inline-supabase"
            onClick={onOpenSupabase}
            title="View Supabase SQL & Database setup"
          >
            <FiZap />
            <span>Supabase SQL</span>
          </button>
        )}
      </div>

      {/* ── Menu Trigger (Labeled pill instead of mystery dots) ── */}
      <button
        type="button"
        className={`studio-menu-trigger ${badgeClass} ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export, APK, and project actions"
      >
        <span className="studio-trigger-dot" aria-hidden="true" />
        <span className="studio-trigger-label-compact">{triggerLabel}</span>
        <span className="studio-trigger-label-wide">More</span>
        <FiChevronDown className={`studio-trigger-chevron ${open ? "is-rotated" : ""}`} />
      </button>

      {/* ── Dropdown (Desktop) / Bottom Sheet (Mobile) ── */}
      {open && (
        <>
          <div className="studio-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="studio-menu-panel" role="menu">
            {/* Mobile sheet header */}
            <div className="studio-sheet-header">
              <div className="studio-sheet-handle" />
              <div className="studio-sheet-title-row">
                <span>Export &amp; Build Options</span>
                <button
                  type="button"
                  className="studio-sheet-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Shown in menu on compact screens where inline buttons are hidden */}
            <button
              type="button"
              role="menuitem"
              className="studio-menu-item studio-compact-only"
              onClick={run(onExport)}
              disabled={disabled}
            >
              <FiDownload />
              <div className="studio-menu-item-text">
                <span>Export Source ZIP</span>
                <small>Download complete Flutter project</small>
              </div>
            </button>

            <div className="studio-compact-only">
              <ApkButton
                className="studio-menu-item"
                status={apk.apkStatus}
                progress={apk.apkProgress}
                message={apk.apkMessage}
                disabled={disabled}
                onClick={run(apk.makeApk)}
              />
            </div>

            {isSupabaseProject && (
              <button
                type="button"
                role="menuitem"
                className="studio-menu-item studio-compact-only"
                onClick={run(onOpenSupabase)}
              >
                <FiZap />
                <div className="studio-menu-item-text">
                  <span>Supabase SQL &amp; DB</span>
                  <small>Copy table schema &amp; credentials</small>
                </div>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="studio-menu-item studio-hide-mobile"
              onClick={run(onMobileQR)}
              disabled={disabled || previewLoading}
            >
              <FiSmartphone />
              <div className="studio-menu-item-text">
                <span>Test on Phone (QR)</span>
                <small>Scan to preview on your mobile device</small>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}