import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteProject, listProjects, toggleFavorite } from "../api/projectApi";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "../components/ThemeToggle";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "favorites" | "supabase"

  useEffect(() => {
    listProjects()
      .then((data) => setProjects(data.projects || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const favorite = async (event, id) => {
    event.stopPropagation();
    try {
      const data = await toggleFavorite(id);
      setProjects((items) =>
        items.map((item) =>
          item._id === id ? { ...item, isFavorite: data.project.isFavorite } : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (event, id) => {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(id);
      setProjects((items) => items.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((item) => {
      const query = search.toLowerCase();
      const matchesQuery =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.prompt?.toLowerCase().includes(query) ||
        item.supabaseTable?.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (filter === "favorites") return !!item.isFavorite;
      if (filter === "supabase") return item.storageMode === "supabase";
      return true;
    });
  }, [projects, search, filter]);

  return (
    <main className="app-shell dashboard-screen">
      {/* ── Studio Header ── */}
      <header className="topbar">
        <div className="topbar-brand-group">
          <span className="studio-logo-mark" aria-hidden="true">
            V
          </span>
          <div>
            <p className="eyebrow">Studio Workspace</p>
            <h1>Welcome back, {user?.name?.split(" ")[0] || "Builder"}.</h1>
          </div>
        </div>

        <div className="top-actions">
          <ThemeToggle />
          <button type="button" className="ghost-button" onClick={logout}>
            Sign out
          </button>
          <Link className="primary-link" to="/build">
            <span>New build</span>
            <span aria-hidden="true">⚡</span>
          </Link>
        </div>
      </header>

      {error && <div className="form-error page-error">{error}</div>}

      {/* ── Search & Filter Controls ── */}
      <section className="dashboard-search-bar">
        <div className="search-input-wrap">
          <span className="search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search projects by prompt, title, or table name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="studio-chips">
          <button
            type="button"
            className={`studio-chip${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
            style={{
              borderColor: filter === "all" ? "var(--teal)" : undefined,
              color: filter === "all" ? "var(--ink)" : undefined,
            }}
          >
            All ({projects.length})
          </button>
          <button
            type="button"
            className={`studio-chip${filter === "favorites" ? " active" : ""}`}
            onClick={() => setFilter("favorites")}
            style={{
              borderColor: filter === "favorites" ? "var(--teal)" : undefined,
              color: filter === "favorites" ? "var(--ink)" : undefined,
            }}
          >
            ★ Favorites ({projects.filter((p) => p.isFavorite).length})
          </button>
          <button
            type="button"
            className={`studio-chip${filter === "supabase" ? " active" : ""}`}
            onClick={() => setFilter("supabase")}
            style={{
              borderColor: filter === "supabase" ? "var(--teal)" : undefined,
              color: filter === "supabase" ? "var(--ink)" : undefined,
            }}
          >
            ⚡ Supabase ({projects.filter((p) => p.storageMode === "supabase").length})
          </button>
        </div>
      </section>

      {/* ── Section Title ── */}
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">Project Vault</p>
          <h2>Your synthesized applications</h2>
        </div>
        <span className="project-total">{filteredProjects.length} visible</span>
      </section>

      {/* ── Project Cards Grid ── */}
      {loading ? (
        <div className="empty-state">
          <div className="ticker-pulse-dot" style={{ margin: "0 auto" }} />
          <strong>Loading workspace...</strong>
          <span>Connecting to project database</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <strong>
            {projects.length === 0
              ? "Your first application starts with a prompt."
              : "No projects matched your search."}
          </strong>
          <span>
            {projects.length === 0
              ? "Type an idea into the Prompt Studio and VibeApp will generate the Flutter UI, Supabase tables, and state."
              : "Try adjusting your search query or switching filters."}
          </span>
          <Link className="primary-link" to="/build" style={{ marginTop: "12px" }}>
            Open Prompt Studio <span>↗</span>
          </Link>
        </div>
      ) : (
        <div className="project-grid">
          {filteredProjects.map((project) => {
            const isSupabase = project.storageMode === "supabase";
            return (
              <article
                className="project-card"
                key={project._id}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <div className="card-top">
                  <span
                    className={`project-status${isSupabase ? " supabase-status" : ""}`}
                  >
                    {isSupabase ? "⚡ Supabase" : "Flutter CRUD"}
                  </span>
                  <button
                    type="button"
                    className={`icon-button${project.isFavorite ? " favorited" : ""}`}
                    onClick={(e) => favorite(e, project._id)}
                    aria-label="Toggle favorite"
                  >
                    {project.isFavorite ? "★" : "☆"}
                  </button>
                </div>

                <h3>{project.title}</h3>
                <p>{project.prompt}</p>

                <div className="card-bottom">
                  <span>Version {project.version || 1}</span>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={(e) => remove(e, project._id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
