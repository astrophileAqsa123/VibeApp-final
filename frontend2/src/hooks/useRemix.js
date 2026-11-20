import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { remixTemplate } from "../api/projectApi";

/**
 * Remix flow: auth check, cloning, toast message and guest auth prompt.
 */
export default function useRemix({ isAuthenticated }) {
  const navigate = useNavigate();

  const [remixingId, setRemixingId] = useState(null);
  const [remixToast, setRemixToast] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const handleRemix = async (templateId, templateTitle) => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }

    setRemixingId(templateId);
    setRemixToast(`Cloning "${templateTitle}" into your workspace…`);

    try {
      const res = await remixTemplate(templateId);
      if (res.project?._id) {
        setRemixToast("Success! Opening your project editor…");
        setTimeout(() => {
          navigate(`/projects/${res.project._id}`);
        }, 600);
      } else {
        throw new Error("Could not retrieve created project");
      }
    } catch (err) {
      alert(`Remix failed: ${err.message || "Please try again"}`);
      setRemixToast("");
      setRemixingId(null);
    }
  };

  return {
    remixingId,
    remixToast,
    handleRemix,
    authPromptOpen,
    closeAuthPrompt: () => setAuthPromptOpen(false),
  };
}
