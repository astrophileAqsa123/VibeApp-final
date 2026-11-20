import { useState } from "react";

import { restoreProjectVersion, updateProjectChat } from "../../../api/projectApi";

/**
 * Prompt box + chat edits (new version) + restoring an older version.
 * Preview rebuilding is delegated to the web-preview hook through callbacks.
 */
export default function useProjectChat({
  projectId,
  selectedVersion,
  setSelectedVersion,
  setProject,
  setError,
  setNotice,
  rebuildAfterUpdate,
  resetPreview,
  threadBottomRef,
}) {
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState(false);

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

      // If a preview is running, build a new isolated one for the new code.
      await rebuildAfterUpdate(res.project.currentCode);
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
      resetPreview();
    } catch (err) {
      setError(err.message || "Could not restore this version.");
    } finally {
      setUpdating(false);
    }
  };

  return { message, setMessage, updating, submit, restoreSelectedVersion };
}
