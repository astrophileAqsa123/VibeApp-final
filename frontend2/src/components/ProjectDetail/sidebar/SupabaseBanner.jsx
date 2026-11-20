import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiCode, FiCopy, FiZap } from "react-icons/fi";

import useMediaQuery from "../hooks/useMediaQuery";
import "./SupabaseBanner.css";

export default function SupabaseBanner({ tableName, onCopySql, onInspectSql }) {
  // Chhoti screen par sirf title + Copy SQL; baaqi details toggle se
  const isCompact = useMediaQuery("(max-width: 960px)");
  const [expanded, setExpanded] = useState(false);
  const showMore = !isCompact || expanded;

  return (
    <div className="studio-supabase-banner">
      <div className="studio-supabase-banner-header">
        <div className="studio-supabase-banner-title">
          <span className="studio-supabase-indicator" />
          <FiZap className="studio-zap-icon" />
          <span>Table: <code>{tableName}</code></span>
        </div>

        <div className="studio-supabase-banner-controls">
          <button
            type="button"
            className="studio-supabase-banner-copy"
            onClick={onCopySql}
            title="Copy SQL for Supabase SQL Editor"
          >
            <FiCopy /> Copy SQL
          </button>

          {isCompact && (
            <button
              type="button"
              className="studio-supabase-banner-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "Hide details" : "Show details"}
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          )}
        </div>
      </div>

      {showMore && (
        <>
          <p className="studio-supabase-banner-desc">
            Paste SQL in your <strong>Supabase SQL Editor</strong> to create table &amp; policies.
          </p>
          <div className="studio-supabase-banner-actions">
            <button type="button" className="studio-supabase-banner-link" onClick={onInspectSql}>
              <FiCode /> Inspect SQL
            </button>
          </div>
        </>
      )}
    </div>
  );
}
