import { Link } from "react-router-dom";
import { FiArrowLeft, FiPlay, FiSquare } from "react-icons/fi";

import ThemeToggle from "../ThemeToggle";
import HeaderMenu from "./HeaderMenu";
import "./StudioHeader.css";

export default function StudioHeader({
  project,
  selectedVersion,
  displayedCode,
  isSupabaseProject,
  previewUrl,
  previewLoading,
  buildStatus,
  apk,
  onBack,
  onOpenSupabase,
  onExport,
  onMobileQR,
  onRunPreview,
}) {
  return (
    <header className="studio-header">
      <div className="studio-header-left">
        <Link
          to="/dashboard"
          className="studio-back-btn"
          aria-label="Back to start"
          onClick={onBack}
        >
          <FiArrowLeft />
          <span>Back to start</span>
        </Link>

        <div className="studio-header-center">
          <h1 className="studio-title" title={project.title}>
            {project.title}
          </h1>
          <span className="studio-version-pill">
            v{selectedVersion || project.version || 1}
          </span>
        </div>
      </div>

      <div className="studio-header-right">
        <button
          type="button"
          className={`studio-action-pill ${previewUrl ? "active-preview" : "primary"}`}
          onClick={onRunPreview}
          disabled={previewLoading || !displayedCode}
          title={previewUrl ? "Stop live web preview" : "Compile and run interactive preview"}
          aria-label={previewUrl ? "Stop preview" : "Run preview"}
        >
          {previewLoading ? (
            <>
              <span className="studio-tips-spinner" />
              <span>{buildStatus || "Compiling…"}</span>
            </>
          ) : previewUrl ? (
            <>
              <FiSquare />
              <span>Stop preview</span>
            </>
          ) : (
            <>
              <FiPlay />
              <span>Run preview</span>
            </>
          )}
        </button>

        <HeaderMenu
          disabled={!displayedCode}
          previewLoading={previewLoading}
          isSupabaseProject={isSupabaseProject}
          apk={apk}
          onExport={onExport}
          onMobileQR={onMobileQR}
          onOpenSupabase={onOpenSupabase}
        />

        <ThemeToggle />
      </div>
    </header>
  );
}
