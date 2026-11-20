import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

import ThemeToggle from "../ThemeToggle";
import "./TemplatesTopbar.css";

export default function TemplatesTopbar({ isAuthenticated }) {
  return (
    <header className="templates-topbar">
      <div className="templates-brand-group">
        <Link to={isAuthenticated ? "/dashboard" : "/"} className="templates-back-btn">
          <FiArrowLeft />
          <span>{isAuthenticated ? "Studio Dashboard" : "Home"}</span>
        </Link>
        <div className="templates-brand-separator" />
        <div className="templates-title-stack">
          <span className="eyebrow">Community & Starters</span>
          <h1>Flutter App Templates</h1>
        </div>
      </div>

      <div className="templates-top-actions">
        <ThemeToggle />
        {isAuthenticated ? (
          <Link to="/build" className="primary-link">
            <span>Build New App</span>
            <span aria-hidden="true">⚡</span>
          </Link>
        ) : (
          <Link to="/login" className="primary-link">
            <span>Sign In</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </header>
  );
}
