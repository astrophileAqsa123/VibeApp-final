import { useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { downloadProjectExport } from "../api/previewApi";
import MobileQRModal from "../components/MobileQRModal";
import ApkDownloadModal from "../components/ApkDownloadModal";

// Shared styles first, then the page layout (component CSS is imported by each component).
import "../components/ProjectDetail/ProjectDetail.css";
import "../components/ProjectDetail/ExternalModals.css";
import "./ProjectDetails.css";

import { copyToClipboard } from "../components/ProjectDetail/utils";
import StudioHeader from "../components/ProjectDetail/StudioHeader";
import FeedbackBanner from "../components/ProjectDetail/FeedbackBanner";
import SupabaseModal from "../components/ProjectDetail/SupabaseModal";
import PromptSidebar from "../components/ProjectDetail/sidebar/PromptSidebar";
import StudioToolbar from "../components/ProjectDetail/stage/StudioToolbar";
import TipsCarousel from "../components/ProjectDetail/stage/TipsCarousel";
import DeviceFrame from "../components/ProjectDetail/stage/DeviceFrame";
import CodeViewer from "../components/ProjectDetail/stage/CodeViewer";
import MobileTabs from "../components/ProjectDetail/MobileTabs";

import useStudioMessages from "../components/ProjectDetail/hooks/useStudioMessages";
import useProject from "../components/ProjectDetail/hooks/useProject";
import useApkBuild from "../components/ProjectDetail/hooks/useApkBuild";
import useWebPreview from "../components/ProjectDetail/hooks/useWebPreview";
import useProjectChat from "../components/ProjectDetail/hooks/useProjectChat";
import useDeviceScale from "../components/ProjectDetail/hooks/useDeviceScale";
import useMediaQuery from "../components/ProjectDetail/hooks/useMediaQuery";

export default function ProjectDetails() {
  const { projectId } = useParams();

  // Workspace UI state: tab = "preview" | "code", device = "iphone" | "android" | "tablet" | "desktop"
  const [activeTab, setActiveTab] = useState("preview");
  const [codeFile, setCodeFile] = useState("lib/main.dart");
  const [device, setDevice] = useState("iphone");
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  // Sirf mobile/tablet (<= 960px) par use hota hai: "chat" | "stage" (preview/code)
  const [mobilePane, setMobilePane] = useState("chat");
  const threadBottomRef = useRef(null);

  // Order matters: each hook below depends on the ones above it.
  const { error, notice, setError, setNotice, clearMessages } = useStudioMessages();

  const {
    project,
    setProject,
    loading,
    selectedVersion,
    setSelectedVersion,
    versionDiff,
    versionList,
    displayedCode,
    displayedPrompt,
    displayedTableName,
    displayedProjectFiles,
    isSupabaseProject,
    currentTableSql,
  } = useProject(projectId, setError);

  const apk = useApkBuild({ projectId, code: displayedCode, setError, setNotice });

  const preview = useWebPreview({
    projectId,
    code: displayedCode,
    setError,
    setNotice,
    onReady: apk.prepareApkInBackground,
    onShowPreview: () => {
      setActiveTab("preview");
      setMobilePane("stage");
    },
  });

  const chat = useProjectChat({
    projectId,
    selectedVersion,
    setSelectedVersion,
    setProject,
    setError,
    setNotice,
    rebuildAfterUpdate: preview.rebuildAfterUpdate,
    resetPreview: preview.resetPreview,
    threadBottomRef,
  });

  const isGenerating = preview.previewLoading || chat.updating;
  const isDevicePreview = activeTab === "preview" && !isGenerating;
  // Phone par asli phone hi hai, to frame ki jagah preview poori stage mein dikhao
  const isPhone = useMediaQuery("(max-width: 760px)");
  const frameDevice = isPhone ? "bare" : device;

  const { stageRef, deviceScale } = useDeviceScale({
    device,
    activeTab,
    isGenerating,
    ready: Boolean(project),
  });

  /* ── small page-level handlers ───────────────────────────────────────── */
  const exportProject = async () => {
    setError("");
    try {
      await downloadProjectExport(projectId);
      setNotice("Project ZIP download started.");
    } catch (err) {
      setError(err.message);
    }
  };

  const copySql = async (successMessage) => {
    await copyToClipboard(currentTableSql);
    setNotice(successMessage);
  };

  const inspectSql = () => {
    setActiveTab("code");
    setCodeFile("schema.sql");
    setMobilePane("stage");
  };

  const pickVersion = (version) => {
    setSelectedVersion(version);
    setActiveTab("code");
    setMobilePane("stage");
  };

  // Mobile par prompt bhejte hi stage dikhao (generation tips / naya preview)
  const submitPrompt = (e) => {
    if (!chat.message.trim() || chat.updating) return chat.submit(e);
    setActiveTab("preview");
    setMobilePane("stage");
    return chat.submit(e);
  };

  const showChat = () => setMobilePane("chat");
  const showStageTab = (tab) => {
    setActiveTab(tab);
    setMobilePane("stage");
  };

  /* ── loading / not found ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <main className="studio-page">
        <div className="studio-stage">
          <div className="studio-tips-wrapper">
            <span className="studio-tips-spinner" />
            <p className="studio-loading-text">Loading project studio…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="studio-page">
        <div className="studio-stage">
          <div className="form-error">{error || "Project not found"}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="studio-page">
      <StudioHeader
        project={project}
        selectedVersion={selectedVersion}
        displayedCode={displayedCode}
        isSupabaseProject={isSupabaseProject}
        previewUrl={preview.previewUrl}
        previewLoading={preview.previewLoading}
        buildStatus={preview.buildStatus}
        apk={apk}
        onBack={preview.stopCurrentSession}
        onOpenSupabase={() => setShowSupabaseModal(true)}
        onExport={exportProject}
        onMobileQR={preview.makeMobilePreview}
        onRunPreview={preview.runPreview}
      />

      <FeedbackBanner error={error} notice={notice} onDismiss={clearMessages} />

      <div className={`studio-workspace pane-${mobilePane}`}>
        {/* LEFT: prompt stream & conversation */}
        <PromptSidebar
          project={project}
          selectedVersion={selectedVersion}
          versionList={versionList}
          versionDiff={versionDiff}
          updating={chat.updating}
          onBackToLatest={() => setSelectedVersion(null)}
          onRestore={chat.restoreSelectedVersion}
          onPickVersion={pickVersion}
          isSupabaseProject={isSupabaseProject}
          tableName={displayedTableName}
          onCopySql={() => copySql("⚡ SQL copied! Paste in your Supabase SQL Editor.")}
          onInspectSql={inspectSql}
          message={chat.message}
          setMessage={chat.setMessage}
          onSubmit={submitPrompt}
          onVoice={() => setNotice("Voice input ready on supported devices.")}
          bottomRef={threadBottomRef}
        />

        {/* RIGHT: preview & code studio */}
        <section className="studio-right-col">
          <StudioToolbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            device={device}
            setDevice={setDevice}
            previewUrl={preview.previewUrl}
            isHotReloading={preview.isHotReloading}
            onReload={preview.reloadPreview}
          />

          <div
            className={`studio-stage ${isDevicePreview ? "is-device-preview" : ""} ${
              isDevicePreview && frameDevice === "desktop" ? "is-desktop-preview" : ""
            } ${isDevicePreview && frameDevice === "bare" ? "is-bare-preview" : ""}`}
            ref={stageRef}
          >
            {isGenerating && activeTab === "preview" ? (
  <TipsCarousel />
) : activeTab === "preview" ? (
              <DeviceFrame
                device={frameDevice}
                scale={deviceScale}
                projectId={projectId}
                title={project.title}
                prompt={displayedPrompt}
                previewUrl={preview.previewUrl}
                previewKey={preview.previewKey}
                isHotReloading={preview.isHotReloading}
                onRunPreview={preview.runPreview}
                onMobileQR={preview.makeMobilePreview}
              />
            ) : (
              <CodeViewer
                code={displayedCode}
                files={displayedProjectFiles}
                codeFile={codeFile}
                onSelectFile={setCodeFile}
                isSupabaseProject={isSupabaseProject}
                sql={currentTableSql}
                supabaseTable={project.supabaseTable}
                onNotice={setNotice}
              />
            )}
          </div>
        </section>
      </div>

      <MobileTabs
        pane={mobilePane}
        activeTab={activeTab}
        onChat={showChat}
        onStageTab={showStageTab}
      />

      {/* APK download / QR modal */}
      <ApkDownloadModal
        open={apk.showApkModal}
        onClose={apk.closeApkModal}
        pageUrl={apk.apkPageUrl}
        qrUrl={apk.apkQrUrl}
        qrCandidates={apk.apkQrCandidates}
        fileUrl={apk.apkDownloadUrl}
        expiresAt={apk.apkLinkExpiresAt}
        releaseSigned={apk.apkReleaseSigned}
        mobileReachable={apk.apkMobileReachable}
        onInstall={apk.installReadyApk}
        installState={apk.apkInstallState}
      />

      {/* Mobile QR modal */}
      <MobileQRModal
        url={preview.mobileUrl}
        candidates={preview.mobileCandidates}
        open={preview.showQR}
        onClose={preview.closeQR}
      />

      {showSupabaseModal && (
        <SupabaseModal
          project={project}
          sql={currentTableSql}
          onClose={() => setShowSupabaseModal(false)}
          onCopy={() => copySql("⚡ SQL copied to clipboard!")}
        />
      )}
    </main>
  );
}
