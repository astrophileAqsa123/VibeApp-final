import { FiZap } from "react-icons/fi";

import "./TemplatesHero.css";

export default function TemplatesHero({ templateCount, totalRemixes }) {
  return (
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
            <strong>{templateCount}+</strong>
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
  );
}
