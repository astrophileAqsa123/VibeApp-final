import { FiCheck, FiCode, FiCopy, FiX, FiZap } from "react-icons/fi";

import "./InspectCodeModal.css";

export default function InspectCodeModal({
  open,
  loading,
  template,
  activeTab,
  onTabChange,
  copied,
  onCopy,
  onClose,
  onRemix,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="inspect-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inspect-modal-header">
          <div className="inspect-title-group">
            <div className="inspect-badge-row">
              <span className="inspect-ver-tag">Version {template?.version || 1}</span>
              {template?.storageMode === "supabase" && (
                <span className="inspect-supabase-tag">⚡ Supabase Table Included</span>
              )}
            </div>
            <h2>{template?.title || "Template Code"}</h2>
            <p className="inspect-author-line">
              Published by <strong>{template?.author?.name || "Community Builder"}</strong>
            </p>
          </div>

          <button
            type="button"
            className="inspect-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {loading ? (
          <div className="inspect-modal-loading">
            <div className="ticker-pulse-dot" />
            <span>Loading Flutter source code…</span>
          </div>
        ) : (
          <>
            <div className="inspect-tabs-bar">
              <div className="inspect-tabs-left">
                <button
                  type="button"
                  className={`inspect-tab-btn ${activeTab === "code" ? "active" : ""}`}
                  onClick={() => onTabChange("code")}
                >
                  <FiCode /> lib/main.dart
                </button>
                {template?.tableSql && (
                  <button
                    type="button"
                    className={`inspect-tab-btn ${activeTab === "sql" ? "active" : ""}`}
                    onClick={() => onTabChange("sql")}
                  >
                    <FiZap /> Schema SQL
                  </button>
                )}
              </div>

              <button
                type="button"
                className="inspect-copy-btn"
                onClick={onCopy}
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <FiCheck /> Copied!
                  </>
                ) : (
                  <>
                    <FiCopy /> Copy
                  </>
                )}
              </button>
            </div>

            <div className="inspect-code-container">
              <pre>
                <code>
                  {activeTab === "sql"
                    ? template?.tableSql || "-- No SQL definition"
                    : template?.code || "// Code not available"}
                </code>
              </pre>
            </div>

            <div className="inspect-modal-footer">
              <div className="inspect-footer-hint">
                <span>💡 Click Remix to create an editable copy of this exact code in your studio.</span>
              </div>

              <button
                type="button"
                className="inspect-remix-btn"
                onClick={() => onRemix(template._id, template.title)}
              >
                <FiZap /> Remix This App
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
