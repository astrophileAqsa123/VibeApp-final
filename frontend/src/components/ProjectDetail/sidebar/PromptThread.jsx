import "./PromptThread.css";

/** List of version cards (one per prompt). `currentVersion` is the latest version number. */
export default function PromptThread({ versionList, currentVersion, selectedVersion, onPick, bottomRef }) {
  return (
    <div className="studio-thread">
      {versionList.map((v) => {
        const isSelected =
          selectedVersion === v.version || (!selectedVersion && v.version === currentVersion);
        return (
          <div
            key={`${v.version}-${v.createdAt}`}
            className={`studio-prompt-card ${isSelected ? "is-active" : ""}`}
            onClick={() => onPick(v.version)}
            title="Click to inspect this prompt's code & preview"
          >
            <div className="studio-prompt-card-header">
              <span className="studio-card-version-tag">Version {v.version}</span>
              {isSelected && <span className="studio-card-active-badge">✦ Active</span>}
            </div>

            <p className="studio-prompt-text">{v.prompt}</p>

            <div className="studio-card-footer">
              <span>
                {v.createdAt
                  ? new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Initial"}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
