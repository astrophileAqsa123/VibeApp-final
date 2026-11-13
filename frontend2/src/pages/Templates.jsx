import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheck,
  FiCode,
  FiCopy,
  FiExternalLink,
  FiFilter,
  FiGlobe,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiShare2,
  FiUser,
  FiX,
  FiZap,
} from "react-icons/fi";

import { listGalleryTemplates, getGalleryTemplate, remixTemplate } from "../api/projectApi";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "../components/ThemeToggle";
import "./Templates.css";

const CATEGORIES = [
  { id: "all", label: "All Templates", icon: "✦" },
  { id: "productivity", label: "Productivity", icon: "⏰" },
  { id: "finance", label: "Finance & Budget", icon: "💳" },
  { id: "supabase", label: "⚡ Supabase Realtime", icon: "⚡" },
  { id: "healthcare", label: "Healthcare", icon: "🩺" },
  { id: "inventory", label: "Inventory & Commerce", icon: "📦" },
  { id: "education", label: "Education", icon: "🎓" },
];

export default function Templates() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular"); // "popular" | "newest" | "title"

  // Remixing state
  const [remixingId, setRemixingId] = useState(null);
  const [remixToast, setRemixToast] = useState("");

  // Inspect code modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectTemplate, setInspectTemplate] = useState(null);
  const [inspectActiveTab, setInspectActiveTab] = useState("code"); // "code" | "sql"
  const [copiedCode, setCopiedCode] = useState(false);

  // Auth requirement modal
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [pendingRemixId, setPendingRemixId] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listGalleryTemplates({
        search,
        category: selectedCategory,
        sort: sortBy,
      });
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, sortBy]);

  // Handle live search filter locally as well for instant feel
  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.trim().toLowerCase();
    return templates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        t.author?.name?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const handleRemix = async (templateId, templateTitle) => {
    if (!isAuthenticated) {
      setPendingRemixId(templateId);
      setAuthPromptOpen(true);
      return;
    }

    setRemixingId(templateId);
    setRemixToast(`Cloning "${templateTitle}" into your workspace…`);

    try {
      const res = await remixTemplate(templateId);
      if (res.project?._id) {
        setRemixToast(`Success! Opening your project editor…`);
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

  const handleInspect = async (templateId) => {
    setInspectModalOpen(true);
    setInspectLoading(true);
    setInspectActiveTab("code");
    setCopiedCode(false);

    try {
      const res = await getGalleryTemplate(templateId);
      setInspectTemplate(res.template);
    } catch (err) {
      alert(`Could not load code: ${err.message}`);
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (!inspectTemplate?.code) return;
    navigator.clipboard.writeText(inspectTemplate.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const totalRemixes = useMemo(() => {
    return templates.reduce((acc, t) => acc + (t.remixCount || 0), 0);
  }, [templates]);

  return (
    <main className="app-shell templates-page">
      {/* ── Toast banner ── */}
      {remixToast && (
        <div className="remix-toast">
          <span className="remix-spinner" />
          <span>{remixToast}</span>
        </div>
      )}

      {/* ── Top Header Bar ── */}
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

      {/* ── Hero Banner ── */}
      <section className="templates-hero-banner">
        <div className="hero-content">
          <span className="hero-badge">
            <FiZap /> 1-Click Project Remixing
          </span>
          <h2>Explore, Clone & Customize Ready-to-Run Flutter Apps</h2>
          <p>
            Choose from built-in starter templates or community-published applications. Click{" "}
            <strong>Remix</strong> to instantly copy the code, database schema, and layout into your
            workspace to compile and edit with AI.
          </p>

          <div className="hero-stats-row">
            <div className="hero-stat-box">
              <strong>{templates.length}+</strong>
              <span>App Templates</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-box">
              <strong>{totalRemixes}+</strong>
              <span>Community Remixes</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-box">
              <strong>100%</strong>
              <span>Flutter 3.x Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Controls Bar: Search, Category Pills, Sort ── */}
      <section className="templates-controls">
        <div className="templates-search-wrapper">
          <FiSearch className="templates-search-icon" />
          <input
            type="text"
            placeholder="Search templates by title, keyword, author, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchTemplates();
            }}
          />
          {search && (
            <button
              type="button"
              className="templates-search-clear"
              onClick={() => {
                setSearch("");
                fetchTemplates();
              }}
            >
              <FiX />
            </button>
          )}
        </div>

        <div className="templates-sort-group">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="templates-sort-select"
          >
            <option value="popular">Most Remixed</option>
            <option value="newest">Recently Published</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </section>

      {/* ── Category Pills ── */}
      <div className="templates-categories">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`templates-cat-chip ${isActive ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Error Notice ── */}
      {error && <div className="form-error page-error">{error}</div>}

      {/* ── Templates Grid ── */}
      {loading ? (
        <div className="empty-state">
          <div className="ticker-pulse-dot" style={{ margin: "0 auto" }} />
          <strong>Loading templates gallery…</strong>
          <span>Fetching community projects and starter builds</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">
          <strong>No templates found.</strong>
          <span>Try adjusting your search keywords or choosing another category.</span>
          <button
            type="button"
            className="primary-link"
            style={{ marginTop: 12 }}
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              fetchTemplates();
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map((item) => {
            const isSupabase = item.storageMode === "supabase";
            const isUserOwner = user && item.author?.id === (user.id || user._id);
            const isRemixing = remixingId === item._id;

            return (
              <article className="template-card" key={item._id}>
                {/* Top header */}
                <div className="template-card-top">
                  <div className="template-badge-group">
                    <span
                      className={`template-badge ${isSupabase ? "supabase-badge" : "crud-badge"}`}
                    >
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
                    <span className="template-author-name">
                      {item.author?.name || "Community Builder"}
                    </span>
                  </div>
                  {isUserOwner && <span className="template-owner-badge">Your App</span>}
                </div>

                {/* Card Actions */}
                <div className="template-card-actions">
                  <button
                    type="button"
                    className="template-btn-inspect"
                    onClick={() => handleInspect(item._id)}
                    title="Inspect Flutter code & schema"
                  >
                    <FiCode /> Code
                  </button>

                  <button
                    type="button"
                    className="template-btn-remix"
                    onClick={() => handleRemix(item._id, item.title)}
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
          })}
        </div>
      )}

      {/* ===================================================================
          INSPECT CODE MODAL
          =================================================================== */}
      {inspectModalOpen && (
        <div className="modal-overlay" onClick={() => setInspectModalOpen(false)}>
          <div className="inspect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inspect-modal-header">
              <div className="inspect-title-group">
                <div className="inspect-badge-row">
                  <span className="inspect-ver-tag">Version {inspectTemplate?.version || 1}</span>
                  {inspectTemplate?.storageMode === "supabase" && (
                    <span className="inspect-supabase-tag">⚡ Supabase Table Included</span>
                  )}
                </div>
                <h2>{inspectTemplate?.title || "Template Code"}</h2>
                <p className="inspect-author-line">
                  Published by <strong>{inspectTemplate?.author?.name || "Community Builder"}</strong>
                </p>
              </div>

              <button
                type="button"
                className="inspect-close-btn"
                onClick={() => setInspectModalOpen(false)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            {inspectLoading ? (
              <div className="inspect-modal-loading">
                <div className="ticker-pulse-dot" />
                <span>Loading Flutter source code…</span>
              </div>
            ) : (
              <>
                <div className="inspect-tabs-bar">
                  <div className="inspect-tabs-left">
                    <button
                      type="button"
                      className={`inspect-tab-btn ${inspectActiveTab === "code" ? "active" : ""}`}
                      onClick={() => setInspectActiveTab("code")}
                    >
                      <FiCode /> lib/main.dart
                    </button>
                    {inspectTemplate?.tableSql && (
                      <button
                        type="button"
                        className={`inspect-tab-btn ${inspectActiveTab === "sql" ? "active" : ""}`}
                        onClick={() => setInspectActiveTab("sql")}
                      >
                        <FiZap /> Schema SQL
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="inspect-copy-btn"
                    onClick={copyCodeToClipboard}
                    title="Copy to clipboard"
                  >
                    {copiedCode ? (
                      <>
                        <FiCheck /> Copied!
                      </>
                    ) : (
                      <>
                        <FiCopy /> Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="inspect-code-container">
                  <pre>
                    <code>
                      {inspectActiveTab === "sql"
                        ? inspectTemplate?.tableSql || "-- No SQL definition"
                        : inspectTemplate?.code || "// Code not available"}
                    </code>
                  </pre>
                </div>

                <div className="inspect-modal-footer">
                  <div className="inspect-footer-hint">
                    <span>💡 Click Remix to create an editable copy of this exact code in your studio.</span>
                  </div>

                  <button
                    type="button"
                    className="inspect-remix-btn"
                    onClick={() => {
                      setInspectModalOpen(false);
                      handleRemix(inspectTemplate._id, inspectTemplate.title);
                    }}
                  >
                    <FiZap /> Remix This App
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          AUTH PROMPT MODAL (FOR GUEST USERS)
          =================================================================== */}
      {authPromptOpen && (
        <div className="modal-overlay" onClick={() => setAuthPromptOpen(false)}>
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
              <button
                type="button"
                className="ghost-button"
                onClick={() => setAuthPromptOpen(false)}
              >
                Cancel
              </button>
              <Link to="/login" className="primary-link">
                Sign In to Remix
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
