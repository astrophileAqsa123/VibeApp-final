import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";

import "./AuthPromptModal.css";

export default function AuthPromptModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-prompt-icon">
          <FiLock />
        </div>
        <h3>Sign in to Remix</h3>
        <p>
          Remixing copies this complete Flutter application into your private workspace so you can
          compile previews, edit widgets, and customize features.
        </p>
        <div className="auth-prompt-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <Link to="/login" className="primary-link">
            Sign In to Remix
          </Link>
        </div>
      </div>
    </div>
  );
}
