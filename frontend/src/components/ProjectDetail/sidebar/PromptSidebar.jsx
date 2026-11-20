import VersionNotice from "./VersionNotice";
import SupabaseBanner from "./SupabaseBanner";
import PromptThread from "./PromptThread";
import PromptInput from "./PromptInput";
import "./PromptSidebar.css";

/** Left column: model header, version notice, Supabase banner, prompt history, prompt input. */
export default function PromptSidebar({
  project,
  selectedVersion,
  versionList,
  versionDiff,
  updating,
  onBackToLatest,
  onRestore,
  onPickVersion,
  isSupabaseProject,
  tableName,
  onCopySql,
  onInspectSql,
  message,
  setMessage,
  onSubmit,
  onVoice,
  bottomRef,
}) {
  const currentVersion = project.version || 1;

  return (
    <aside className="studio-left-col">
      <div className="studio-left-header">
        <div className="studio-model-badge">
          <span className="studio-sparkle-icon">✦</span>
          <span>VibeApp AI</span>
          <span className="studio-model-sub">• Flutter Engine</span>
        </div>
      </div>

      <VersionNotice
        selectedVersion={selectedVersion}
        currentVersion={project.version}
        versionDiff={versionDiff}
        updating={updating}
        onRestore={onRestore}
        onBack={onBackToLatest}
      />

      {isSupabaseProject && (
        <SupabaseBanner
          tableName={tableName}
          onCopySql={onCopySql}
          onInspectSql={onInspectSql}
        />
      )}

      <PromptThread
        versionList={versionList}
        currentVersion={currentVersion}
        selectedVersion={selectedVersion}
        onPick={onPickVersion}
        bottomRef={bottomRef}
      />

      <PromptInput
        message={message}
        setMessage={setMessage}
        updating={updating}
        onSubmit={onSubmit}
        onVoice={onVoice}
      />
    </aside>
  );
}
