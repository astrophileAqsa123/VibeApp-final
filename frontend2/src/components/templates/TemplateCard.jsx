import { FiCode, FiCopy, FiZap } from "react-icons/fi";

import "./shared.css";
import "./TemplateCard.css";

export default function TemplateCard({ item, user, isRemixing, onInspect, onRemix }) {
  const isSupabase = item.storageMode === "supabase";
  const isUserOwner = user && item.author?.id === (user.id || user._id);

  return (
    <article className="template-card">
      {/* Top header */}
      <div className="template-card-top">
        <div className="template-badge-group">
          <span className={`template-badge ${isSupabase ? "supabase-badge" : "crud-badge"}`}>
            {isSupabase ? "⚡ Supabase" : "📱 Flutter CRUD"}
          </span>
          <span className="template-version-badge">v{item.version || 1}</span>
        </div>

        <span className="template-remix-counter" title={`${item.remixCount || 0} remixes`}>
          <FiCopy /> {item.remixCount || 0}
        </span>
      </div>

      {/* Title & Description */}
      <div className="template-card-main">
        <div className="template-title-row">
          <span className="template-icon-display">
            {item.icon || (isSupabase ? "⚡" : "📱")}
          </span>
          <h3 title={item.title}>{item.title}</h3>
        </div>

        <p className="template-card-desc">{item.description}</p>
      </div>

      {/* Tags */}
      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div className="template-card-tags">
          {item.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="template-tag-pill">
              #{tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="template-tag-more">+{item.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Author Info */}
      <div className="template-author-row">
        <div className="template-author-info">
          <span className="template-author-avatar">
            {item.author?.name ? item.author.name.charAt(0).toUpperCase() : "U"}
          </span>
          <span className="template-author-name">{item.author?.name || "Community Builder"}</span>
        </div>
        {isUserOwner && <span className="template-owner-badge">Your App</span>}
      </div>

      {/* Card Actions */}
      <div className="template-card-actions">
        <button
          type="button"
          className="template-btn-inspect"
          onClick={() => onInspect(item._id)}
          title="Inspect Flutter code & schema"
        >
          <FiCode /> Code
        </button>

        <button
          type="button"
          className="template-btn-remix"
          onClick={() => onRemix(item._id, item.title)}
          disabled={isRemixing}
          title="Clone this template into your workspace"
        >
          {isRemixing ? (
            <>
              <span className="remix-spinner-small" />
              <span>Cloning…</span>
            </>
          ) : (
            <>
              <FiZap />
              <span>Remix</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
