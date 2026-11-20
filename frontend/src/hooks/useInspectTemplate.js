import { useState } from "react";
import { getGalleryTemplate } from "../api/projectApi";

/**
 * Inspect-code modal state: open/close, loading, active tab and clipboard copy.
 */
export default function useInspectTemplate() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("code"); // "code" | "sql"
  const [copied, setCopied] = useState(false);

  const openInspect = async (templateId) => {
    setOpen(true);
    setLoading(true);
    setTemplate(null);
    setActiveTab("code");
    setCopied(false);

    try {
      const res = await getGalleryTemplate(templateId);
      setTemplate(res.template);
    } catch (err) {
      alert(`Could not load code: ${err.message}`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const closeInspect = () => setOpen(false);

  // Copies whichever tab is currently visible (code or SQL)
  const copyActiveTab = () => {
    const text = activeTab === "sql" ? template?.tableSql : template?.code;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    open,
    loading,
    template,
    activeTab,
    setActiveTab,
    copied,
    openInspect,
    closeInspect,
    copyActiveTab,
  };
}
