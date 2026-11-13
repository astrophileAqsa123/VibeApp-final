import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-art" aria-hidden="true">
        <span className="art-line line-one" />
        <span className="art-line line-two" />
        <div className="art-copy">
          <p className="eyebrow" style={{ color: "var(--teal-neon)" }}>
            VibeApp Studio
          </p>
          <strong>
            From an idea
            <br />
            to a Flutter app.
          </strong>

          <div className="auth-build-animation">
            <div className="auth-build-glow" />

            <div className="auth-prompt-card">
              <div className="auth-prompt-label">
                <span className="auth-live-dot" />
                PROMPT
              </div>
              <div className="auth-prompt-text">
                Build a task manager
                <span className="auth-cursor" />
              </div>
            </div>

            <div className="auth-flow-line">
              <span />
            </div>

            <div className="auth-mini-phone">
              <div className="auth-phone-notch" />
              <div className="auth-phone-screen">
                <div className="auth-phone-head">
                  <div>
                    <small>VIBEAPP</small>
                    <b>My Tasks</b>
                  </div>
                  <span>V</span>
                </div>

                <div className="auth-phone-progress">
                  <i />
                </div>

                <div className="auth-phone-task auth-phone-task--done">
                  <em>✓</em>
                  <div>
                    <b>Create project</b>
                    <small>Complete</small>
                  </div>
                </div>

                <div className="auth-phone-task auth-phone-task--active">
                  <em />
                  <div>
                    <b>Build Flutter UI</b>
                    <small>Generating...</small>
                  </div>
                </div>

                <div className="auth-phone-task auth-phone-task--waiting">
                  <em />
                  <div>
                    <b>Connect database</b>
                    <small>Waiting</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-code-card">
              <div className="auth-code-head">
                <span />
                <span />
                <span />
                <small>main.dart</small>
              </div>
              <div className="auth-code-lines">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-inner">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "36px",
            }}
          >
            <Link to="/" className="brand-mark" style={{ margin: 0 }} aria-label="Back to VibeApp home">
              <span className="studio-logo-mark">V</span>
              <span>VibeApp</span>
            </Link>
            <ThemeToggle />
          </div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}
