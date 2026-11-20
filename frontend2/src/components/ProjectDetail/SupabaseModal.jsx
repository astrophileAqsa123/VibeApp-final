import { FiCopy, FiExternalLink, FiX, FiZap } from "react-icons/fi";

import "./SupabaseModal.css";

export default function SupabaseModal({ project, sql, onClose, onCopy }) {
  return (
    <div className="studio-modal-overlay" onClick={onClose}>
      <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-header">
          <h3>
            <FiZap /> Supabase Configuration
          </h3>
          <button type="button" className="studio-modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="supabase-info-grid">
          <div className="supabase-info-item">
            <small>Project URL</small>
            <code>{project.supabaseUrl || "—"}</code>
          </div>
          <div className="supabase-info-item">
            <small>Table Name</small>
            <code>{project.supabaseTable || "—"}</code>
          </div>
        </div>

        <div className="supabase-sql-block">
          <div className="studio-modal-sql-head">
            <span className="studio-modal-sql-title">PostgreSQL Table Migration Script</span>
            <button type="button" className="copy-sql-button" onClick={onCopy}>
              <FiCopy /> Copy SQL
            </button>
          </div>
          <pre>
            <code>{sql}</code>
          </pre>
        </div>

        <div className="studio-modal-footer">
          <a
            href="https://supabase.com/dashboard/project/_/sql"
            target="_blank"
            rel="noreferrer"
            className="studio-action-pill"
          >
            <FiExternalLink /> Open Supabase SQL Editor
          </a>
        </div>
      </div>
    </div>
  );
}
