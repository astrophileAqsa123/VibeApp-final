import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProject } from "../api/projectApi";
import { extractCode, generateApplication, generateSupabaseApplication } from "../api/generationApi";
import ThemeToggle from "../components/ThemeToggle";
import GenerationOverlay from "../components/GenerationOverlay";
import "./Build.css";

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
  const successRef = useRef(null);

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overlayStatus, setOverlayStatus] = useState("generating");

  // Supabase state
  const [useSupabase, setUseSupabase] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
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

  // Smoothly scroll the ready card into view when generation finishes
  useEffect(() => {
    if (result && successRef.current) {
      successRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

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
    setOverlayStatus("generating");
    setCurrentStepIndex(0);
    setError("");
    setTip("");
    setResult(null);
    setShowSqlPreview(false);

    try {
      const generated = useSupabase
        ? await generateSupabaseApplication(value, supabaseUrl.trim(), supabaseAnonKey.trim())
        : await generateApplication(value);
      setOverlayStatus("validating");

      const code = extractCode(generated);

      if (!generated.success || !code) {
        setError(generated.message || "This prompt could not be generated.");
        if (generated.tip) setTip(generated.tip);
        return;
      }

      setOverlayStatus("building");

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
        projectFiles: generated.projectFiles || [],
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

  const handleCopySql = () => {
    if (!result?.tableSql) return;
    navigator.clipboard.writeText(result.tableSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <main className="app-shell build-screen">
      <GenerationOverlay
        open={loading}
        status={overlayStatus}
        message={
          overlayStatus === "repairing"
            ? "Fixing a small code issue..."
            : overlayStatus === "validating"
              ? "Checking your generated Flutter code..."
              : overlayStatus === "building"
                ? "Preparing your app..."
                : "Creating your Flutter app..."
        }
      />

      {/* ── Studio Header ── */}
      <header className="topbar build-topbar">
        <div className="topbar-brand-group">
          <Link to="/dashboard" className="studio-logo-mark" aria-label="VibeApp Dashboard">
            <img src="/logo-symbol.png" alt="VibeApp" />
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

      {/* ── Split Workbench ── */}
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
            <div className="studio-action-status">
              {loading ? (
                <div className="studio-progress-ticker" role="status">
                  <span className="ticker-pulse-dot" />
                  <span>{generationSteps[currentStepIndex]}</span>
                </div>
              ) : result ? (
                <span className="studio-ready-inline">
                  ✓ App generated! Open it in the Studio IDE to preview &amp; edit.
                </span>
              ) : (
                <span className="studio-shortcut-hint">
                  Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to run
                </span>
              )}
            </div>

            <div className="studio-action-buttons">
              {result && !loading && (
                <button
                  type="button"
                  className="studio-run-button"
                  onClick={() => navigate(`/projects/${result._id}`)}
                >
                  <span>Open in Studio IDE</span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}

              <button
                type="button"
                className={result && !loading ? "ghost-button" : "studio-run-button"}
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
              >
                {loading ? (
                  <span>Synthesizing...</span>
                ) : result ? (
                  <span>Regenerate</span>
                ) : (
                  <>
                    <span>Run / Generate Code</span>
                    <span aria-hidden="true">⚡</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Studio Inspector Panel ── */}
        <aside className="studio-inspector">
          {/* 1. Success Callout Card PINNED AT TOP when ready */}
          {result && (
            <div ref={successRef} className="studio-success-callout" role="region" aria-label="Generated application">
              <div className="studio-success-badge">
                <span className="ticker-pulse-dot" />
                <span>STEP 1 OF {result.tableSql ? "2" : "1"} · APP READY</span>
              </div>

              <h3 className="studio-success-title">{result.title}</h3>
              <p className="muted studio-success-meta">
                Version {result.version || 1} saved to workspace. Launch the IDE to see the live Flutter preview.
              </p>

              <button
                type="button"
                className="studio-run-button studio-open-btn"
                onClick={() => navigate(`/projects/${result._id}`)}
              >
                <span>Open App in Studio IDE</span>
                <span aria-hidden="true">↗</span>
              </button>

              {result.tableSql && (
                <div className="studio-supabase-success-card">
                  <div className="studio-sql-header">
                    <span className="studio-sql-title">⚡ Step 2: Create Supabase Table</span>
                    <div className="studio-sql-actions">
                      <button
                        type="button"
                        className={`studio-chip studio-sql-copy-btn ${copiedSql ? "is-copied" : ""}`}
                        onClick={handleCopySql}
                      >
                        {copiedSql ? "✓ Copied!" : "📋 Copy SQL"}
                      </button>
                      <button
                        type="button"
                        className="studio-chip studio-sql-copy-btn"
                        onClick={() => setShowSqlPreview((prev) => !prev)}
                      >
                        {showSqlPreview ? "Hide" : "View SQL"}
                      </button>
                    </div>
                  </div>

                  <p className="studio-sql-hint">
                    Copy this SQL and run it in your <strong>Supabase SQL Editor</strong> to create the{" "}
                    <code>{result.supabaseTable || "items"}</code> table.
                  </p>

                  {showSqlPreview && (
                    <div className="studio-sql-pre-wrapper">
                      <pre className="studio-sql-pre">
                        <code>{result.tableSql}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Specifications Card */}
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

          {/* 3. Real-time Pipeline Card */}
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
        </aside>
      </div>
    </main>
  );
}