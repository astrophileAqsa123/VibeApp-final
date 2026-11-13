import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProject } from "../api/projectApi";
import { extractCode, generateApplication, generateSupabaseApplication } from "../api/generationApi";
import ThemeToggle from "../components/ThemeToggle";

const PROMPT_CATEGORIES = [
  {
    category: "Commerce",
    prompt: "Create an e-commerce product catalog app with title, price, stock, category, and image URL fields",
  },
  {
    category: "Finance",
    prompt: "Build an expense tracker and budget manager with title, amount, category, date, and payment method fields",
  },
  {
    category: "Productivity",
    prompt: "Build a sleek task and project manager with task name, priority, due date, and status fields",
  },
  {
    category: "Health",
    prompt: "Create a medical appointment booking app with patient name, doctor, appointment date, and phone fields",
  },
  {
    category: "SaaS CRM",
    prompt: "Build a customer lead management CRM with company name, contact person, deal value, and pipeline stage fields",
  },
];

const CORE_GENERATION_STEPS = [
  "Parsing prompt into a structured AppSpec...",
  "Validating entities, fields, roles, and capabilities...",
  "Applying reusable UI preset and component configuration...",
  "Generating deterministic Flutter code...",
  "Running static safety checks and saving project...",
];

const SUPABASE_GENERATION_STEPS = [
  "Parsing prompt into a structured AppSpec...",
  "Validating entities, fields, roles, and capabilities...",
  "Applying reusable UI preset and component configuration...",
  "Generating Flutter + Supabase data layer...",
  "Preparing SQL schema, static checks, and saving project...",
];

export default function Build() {
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Supabase state
  const [useSupabase, setUseSupabase] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);
  const generationSteps = useSupabase ? SUPABASE_GENERATION_STEPS : CORE_GENERATION_STEPS;

  // Step ticker animation while loading
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev + 1) % generationSteps.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [loading, generationSteps.length]);

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to generate
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    const value = prompt.trim();
    if (!value || loading) return;

    if (useSupabase) {
      if (!supabaseUrl.trim()) {
        setError("Please enter your Supabase Project URL.");
        return;
      }
      if (!supabaseAnonKey.trim()) {
        setError("Please enter your Supabase Anon Key.");
        return;
      }
    }

    setLoading(true);
    setCurrentStepIndex(0);
    setError("");
    setTip("");
    setResult(null);

    try {
      const generated = useSupabase
        ? await generateSupabaseApplication(value, supabaseUrl.trim(), supabaseAnonKey.trim())
        : await generateApplication(value);

      const code = extractCode(generated);

      if (!generated.success || !code) {
        setError(generated.message || "This prompt could not be generated.");
        if (generated.tip) setTip(generated.tip);
        return;
      }

      const saved = await createProject({
        prompt: value,
        code,
        title: value.slice(0, 42),
        source: generated.source || "template",
        appConfig: generated.appConfig || generated.meta?.rawTemplate || null,
        appSpec: generated.appSpec || null,
        requirements: generated.requirements || [],
        componentPlan: generated.componentPlan || [],
        fileManifest: generated.fileManifest || [],
        entrypoint: generated.entrypoint || "lib/main.dart",
        ...(useSupabase
          ? {
              storageMode: "supabase",
              supabaseUrl: supabaseUrl.trim(),
              supabaseAnonKey: supabaseAnonKey.trim(),
              supabaseTable: generated.tableName || "",
              tableSql: generated.tableSql || "",
            }
          : {}),
      });

      setResult(saved.project);
    } catch (requestError) {
      setError(requestError.message || "Failed to generate application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell build-screen">
      {/* ── Studio Header ── */}
      <header className="topbar">
        <div className="topbar-brand-group">
          <Link to="/dashboard" className="studio-logo-mark" aria-label="VibeApp Dashboard">
            V
          </Link>
          <div>
            <p className="eyebrow">Prompt Studio / New Application</p>
            <h1>Synthesize Flutter Application</h1>
          </div>
        </div>

        <div className="top-actions">
          <ThemeToggle />
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setPrompt("");
              setResult(null);
              setError("");
              if (textareaRef.current) textareaRef.current.focus();
            }}
          >
            Clear
          </button>
          <Link className="ghost-button" to="/dashboard">
            Back to projects
          </Link>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="form-error page-error" role="alert">
          <strong>Generation Error</strong>
          <p>{error}</p>
          {tip && <p className="form-error-tip">{tip}</p>}
        </div>
      )}

      {/* ── Google AI Studio-Inspired Split Workbench ── */}
      <div className="build-studio-layout">
        {/* ── Left: Main Prompt Console ── */}
        <div className="studio-main-card">
          <div className="studio-card-header">
            <div className="studio-model-badge">
              <i aria-hidden="true" />
              <span>VibeEngine v4.1 · Flutter 3.x {useSupabase ? "+ Supabase" : "· Local-first"}</span>
            </div>
            <span className="studio-meta-tracker">
              {prompt.length} chars · {prompt.trim() ? Math.ceil(prompt.trim().split(/\s+/).length * 1.3) : 0} tokens
            </span>
          </div>

          <div className="studio-textarea-wrapper">
            <textarea
              ref={textareaRef}
              className="studio-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the application you want to build in plain words... (e.g., 'Create a real estate listing app with property title, price, bedrooms, location, and status fields')"
              rows={6}
              autoFocus
            />
          </div>

          {/* ── Domain Prompt Chips ── */}
          <div className="studio-categories">
            <p className="studio-categories-label">Prompt Inspiration</p>
            <div className="studio-chips">
              {PROMPT_CATEGORIES.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  className="studio-chip"
                  onClick={() => {
                    setPrompt(item.prompt);
                    if (textareaRef.current) textareaRef.current.focus();
                  }}
                >
                  {item.category}
                </button>
              ))}
            </div>
          </div>

          {/* ── Supabase Integration Vault ── */}
          <div className="studio-supabase-drawer">
            <label className="studio-supabase-toggle">
              <div className="studio-supabase-left">
                <input
                  type="checkbox"
                  checked={useSupabase}
                  onChange={(e) => setUseSupabase(e.target.checked)}
                />
                <span>⚡ Connect Supabase Cloud Database</span>
              </div>
              <span className="supabase-badge-pill">
                {useSupabase ? "ACTIVE" : "OPTIONAL"}
              </span>
            </label>

            {useSupabase && (
              <div className="studio-supabase-fields">
                <p className="studio-supabase-hint">
                  VibeApp will automatically generate Flutter Supabase CRUD code, table schemas, and SQL migration scripts.
                  Find credentials in your <strong>Supabase Dashboard → Settings → API</strong>.
                </p>
                <input
                  type="url"
                  placeholder="Supabase Project URL (e.g. https://xyzcompany.supabase.co)"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="studio-input"
                />
                <input
                  type="text"
                  placeholder="Supabase Anon Public Key (eyJhbGciOi...)"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="studio-input"
                />
              </div>
            )}
          </div>

          {/* ── Bottom Action Bar ── */}
          <div className="studio-action-bar">
            <div>
              {loading ? (
                <div className="studio-progress-ticker" role="status">
                  <span className="ticker-pulse-dot" />
                  <span>{generationSteps[currentStepIndex]}</span>
                </div>
              ) : (
                <span className="studio-shortcut-hint">
                  Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to run
                </span>
              )}
            </div>

            <button
              type="button"
              className="studio-run-button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <span>Synthesizing...</span>
              ) : (
                <>
                  <span>Run / Generate Code</span>
                  <span aria-hidden="true">⚡</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right: Studio Inspector Panel ── */}
        <aside className="studio-inspector">
          {/* Specifications Card */}
          <div className="inspector-card">
            <p className="inspector-title">Engine Configuration</p>
            <div className="inspector-spec-list">
              <div className="spec-item">
                <span className="spec-label">Framework</span>
                <span className="spec-val">Flutter 3.x</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Language</span>
                <span className="spec-val">Dart 3.x</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Architecture</span>
                <span className="spec-val">StatefulWidget CRUD</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Database</span>
                <span className="spec-val">
                  {useSupabase ? "Supabase Cloud" : "Local App State"}
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Output Target</span>
                <span className="spec-val">Web + Android APK</span>
              </div>
            </div>
          </div>

          {/* Real-time Pipeline Card */}
          <div className="inspector-card">
            <p className="inspector-title">Generation Pipeline</p>
            <div className="studio-step-list">
              <div className="studio-step-item">
                <span className="studio-step-num">01</span>
                <span>Extract fields, types, and visual theme from prompt</span>
              </div>
              <div className="studio-step-item">
                <span className="studio-step-num">02</span>
                <span>Assemble responsive Material 3 ListView and Form dialogs</span>
              </div>
              <div className="studio-step-item">
                <span className="studio-step-num">03</span>
                <span>{useSupabase ? "Prepare Supabase schema and SQL" : "Configure local data layer with no cloud dependency"}</span>
              </div>
              <div className="studio-step-item">
                <span className="studio-step-num">04</span>
                <span>Save version 1 to workspace with instant Live Preview</span>
              </div>
            </div>
          </div>

          {/* Success Callout Card */}
          {result && (
            <div className="studio-success-callout">
              <p className="eyebrow">Ready in Workspace</p>
              <h3>{result.title}</h3>
              <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                Version {result.version || 1} generated successfully.
              </p>

              {result.tableSql && (
                <div
                  className="studio-supabase-success-card"
                  style={{
                    marginTop: 14,
                    padding: 12,
                    background: "rgba(6, 182, 212, 0.08)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    borderRadius: 10,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--cyan-light, #22d3ee)" }}>
                      ⚡ Supabase SQL Table
                    </span>
                    <button
                      type="button"
                      className="studio-chip"
                      style={{
                        fontSize: "0.7rem",
                        padding: "3px 10px",
                        cursor: "pointer",
                        background: copiedSql ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.15)",
                        borderColor: copiedSql ? "var(--teal)" : "rgba(6, 182, 212, 0.35)",
                        color: copiedSql ? "var(--teal-light)" : "var(--cyan-light, #22d3ee)",
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(result.tableSql);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                    >
                      {copiedSql ? "✓ Copied!" : "📋 Copy SQL"}
                    </button>
                  </div>
                  <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "0 0 8px 0", lineHeight: 1.35 }}>
                    Paste this into your <strong>Supabase SQL Editor</strong> to create the <code>{result.supabaseTable || "items"}</code> table.
                  </p>
                  <pre
                    style={{
                      maxHeight: 140,
                      overflow: "auto",
                      padding: 8,
                      background: "rgba(0,0,0,0.35)",
                      borderRadius: 6,
                      fontSize: "0.68rem",
                      fontFamily: "monospace",
                      margin: 0,
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--ink-light, #94a3b8)",
                      whiteSpace: "pre",
                    }}
                  >
                    <code>{result.tableSql}</code>
                  </pre>
                </div>
              )}

              <button
                type="button"
                className="primary-link"
                style={{ marginTop: 14 }}
                onClick={() => navigate(`/projects/${result._id}`)}
              >
                Open in Studio IDE <span>↗</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
