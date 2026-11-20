import { FiRotateCcw } from "react-icons/fi";

import "./VersionNotice.css";

/** "Viewing Version N" bar (restore / back) + the diff summary for that version. */
export default function VersionNotice({
  selectedVersion,
  currentVersion,
  versionDiff,
  updating,
  onRestore,
  onBack,
}) {
  if (!selectedVersion) return null;

  return (
    <>
      <div className="studio-historical-notice">
        <span>Viewing Version {selectedVersion}</span>
        <div className="studio-historical-actions">
          {selectedVersion !== currentVersion && (
            <button
              type="button"
              className="studio-restore-version-btn"
              onClick={onRestore}
              disabled={updating}
            >
              <FiRotateCcw /> Restore as new version
            </button>
          )}
          <button type="button" className="studio-return-latest-btn" onClick={onBack}>
            Back to latest
          </button>
        </div>
      </div>

      {versionDiff?.available && (
        <div className="studio-version-diff">
          <strong>{versionDiff.summary}</strong>
          {(versionDiff.changes || []).slice(0, 8).map((change, index) => (
            <span key={`${change.area}-${change.id}-${index}`} className={`diff-${change.type}`}>
              {change.type === "added" ? "+" : change.type === "removed" ? "−" : "~"} {change.label || change.id}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
