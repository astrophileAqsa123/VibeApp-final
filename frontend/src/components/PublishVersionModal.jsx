import { useState, useEffect } from "react";
import { FiCheck, FiGlobe, FiLock, FiX, FiExternalLink } from "react-icons/fi";
import { publishProjectVersion, getProjectPublishStatus } from "../api/projectApi";
import "./PublishVersionModal.css";

const CATEGORIES = [
  "Productivity",
  "Finance",
  "Healthcare",
  "Inventory & Commerce",
  "Education",
  "Lifestyle",
  "Supabase Realtime",
  "Utilities",
  "General",
];

export default function PublishVersionModal({
  isOpen,
  onClose,
  projectId,
  project,
  versions = [],
  initialVersion = null,
  onPublished,
}) {
  const [selectedVer, setSelectedVer] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [isCurrentlyPublic, setIsCurrentlyPublic] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Normalize versions list
  const availableVersions =
    versions.length > 0
      ? versions
      : project
      ? [{ version: 1, prompt: project.prompt || "Initial App Build", createdAt: project.createdAt }]
      : [];

  useEffect(() => {
    if (!isOpen || !projectId) return;

    setError("");
    setSuccess("");
    setFetchingStatus(true);

    getProjectPublishStatus(projectId)
      .then((data) => {
        setIsCurrentlyPublic(Boolean(data.isPublic));
        setPublishedVersion(data.publishedVersion || 1);
        setTitle(data.publicTitle || project?.title || "");
        setDescription(data.publicDescription || project?.prompt || "");
        setCategory(
          data.category || (project?.storageMode === "supabase" ? "Supabase Realtime" : "General")
        );
        setTags(Array.isArray(data.tags) ? data.tags.join(", ") : "");

        const defaultVer =
          initialVersion ||
          data.publishedVersion ||
          project?.version ||
          availableVersions[availableVersions.length - 1]?.version ||
          1;
        setSelectedVer(defaultVer);
      })
      .catch((err) => {
        setError(err.message);
        setSelectedVer(initialVersion || project?.version || 1);
        setTitle(project?.title || "");
        setDescription(project?.prompt || "");
      })
      .finally(() => setFetchingStatus(false));
  }, [isOpen, projectId, initialVersion, project]);

  if (!isOpen) return null;

  const handlePublish = async (publishState) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await publishProjectVersion(projectId, {
        isPublic: publishState,
        version: selectedVer,
        title: title.trim() || project.title,
        description: description.trim() || project.prompt,
        category,
        tags: tagList,
      });

      setIsCurrentlyPublic(publishState);
      if (publishState) {
        setPublishedVersion(selectedVer);
        setSuccess(`Version ${selectedVer} is now live on the Community Templates page!`);
      } else {
        setSuccess("Project has been made private and removed from Templates.");
      }

      if (onPublished) {
        onPublished(res.project);
      }
    } catch (err) {
      setError(err.message || "Failed to update publishing status");
    } finally {
      setLoading(false);
    }
  };

  const currentVerObj = availableVersions.find((v) => v.version === Number(selectedVer));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="publish-modal-header">
          <div className="publish-modal-title-group">
            <span className="publish-modal-badge">
              <FiGlobe /> Community Gallery
            </span>
            <h2>Publish to Templates</h2>
          </div>
          <button
            type="button"
            className="publish-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FiX />
          </button>
        </div>

        <p className="publish-modal-subtitle">
          Share a specific version of your Flutter application with the VibeApp community. Anyone can
          explore and <strong>remix</strong> your code to start their own project.
        </p>

        {fetchingStatus ? (
          <div className="publish-modal-loading">
            <span className="publish-spinner" />
            <span>Loading version status…</span>
          </div>
        ) : (
          <div className="publish-modal-body">
            {error && <div className="publish-alert error">{error}</div>}
            {success && (
              <div className="publish-alert success">
                <FiCheck style={{ marginRight: 6 }} /> {success}
                {isCurrentlyPublic && (
                  <a
                    href="/templates"
                    target="_blank"
                    rel="noreferrer"
                    className="publish-preview-link"
                  >
                    View in Templates <FiExternalLink />
                  </a>
                )}
              </div>
            )}

            {isCurrentlyPublic && (
              <div className="publish-status-banner">
                <span className="status-live-dot" />
                <div>
                  <strong>Currently Live: Version {publishedVersion}</strong>
                  <p>Community members can currently discover and remix this app.</p>
                </div>
              </div>
            )}

            {/* Version Selection */}
            <div className="publish-field-group">
              <label htmlFor="publish-version-select">
                Select Version to Make Public <span className="req">*</span>
              </label>
              <select
                id="publish-version-select"
                className="publish-input"
                value={selectedVer}
                onChange={(e) => {
                  const ver = Number(e.target.value);
                  setSelectedVer(ver);
                  const found = availableVersions.find((v) => v.version === ver);
                  if (found && !description) {
                    setDescription(found.prompt || "");
                  }
                }}
              >
                {availableVersions.map((v) => (
                  <option key={v.version} value={v.version}>
                    Version {v.version}{" "}
                    {v.version === publishedVersion && isCurrentlyPublic ? "(Currently Live)" : ""}{" "}
                    — {v.prompt ? v.prompt.slice(0, 45) + "…" : "Build snapshot"}
                  </option>
                ))}
              </select>
              {currentVerObj?.prompt && (
                <div className="publish-prompt-preview">
                  <span className="prompt-label">Version prompt:</span>
                  <span className="prompt-text">{currentVerObj.prompt}</span>
                </div>
              )}
            </div>

            {/* Public Title */}
            <div className="publish-field-group">
              <label htmlFor="publish-title">
                Template Title <span className="req">*</span>
              </label>
              <input
                id="publish-title"
                type="text"
                className="publish-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Minimalist Task Manager"
                maxLength={100}
              />
            </div>

            {/* Category */}
            <div className="publish-field-group">
              <label htmlFor="publish-category">Category</label>
              <select
                id="publish-category"
                className="publish-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Public Description */}
            <div className="publish-field-group">
              <label htmlFor="publish-desc">Public Description / Prompt</label>
              <textarea
                id="publish-desc"
                className="publish-input publish-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this app does and what features are included..."
                maxLength={500}
              />
            </div>

            {/* Tags */}
            <div className="publish-field-group">
              <label htmlFor="publish-tags">Tags (comma separated)</label>
              <input
                id="publish-tags"
                type="text"
                className="publish-input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Flutter, Dark Mode, Supabase, CRUD"
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="publish-modal-footer">
          {isCurrentlyPublic && (
            <button
              type="button"
              className="publish-btn-unpublish"
              onClick={() => handlePublish(false)}
              disabled={loading}
              title="Remove this project from community templates"
            >
              <FiLock /> Unpublish (Make Private)
            </button>
          )}

          <div className="publish-footer-right">
            <button
              type="button"
              className="publish-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="publish-btn-primary"
              onClick={() => handlePublish(true)}
              disabled={loading || fetchingStatus}
            >
              {loading ? (
                <>
                  <span className="publish-spinner" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <FiGlobe />
                  <span>
                    {isCurrentlyPublic && selectedVer === publishedVersion
                      ? "Update Published Details"
                      : `Publish Version ${selectedVer}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
