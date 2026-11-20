import { useAuth } from "../hooks/useAuth";
import useTemplates from "../hooks/useTemplates";
import useRemix from "../hooks/useRemix";
import useInspectTemplate from "../hooks/useInspectTemplate";

import RemixToast from "../components/templates/RemixToast";
import TemplatesTopbar from "../components/templates/TemplatesTopbar";
import TemplatesHero from "../components/templates/TemplatesHero";
import TemplatesControls from "../components/templates/TemplatesControls";
import CategoryChips from "../components/templates/CategoryChips";
import TemplatesGrid from "../components/templates/TemplatesGrid";
import InspectCodeModal from "../components/templates/InspectCodeModal";
import AuthPromptModal from "../components/templates/AuthPromptModal";

import "./Templates.css";

export default function Templates() {
  const { user, isAuthenticated } = useAuth();

  const {
    templates,
    filteredTemplates,
    totalRemixes,
    loading,
    error,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    fetchTemplates,
    clearSearch,
    resetFilters,
  } = useTemplates();

  const { remixingId, remixToast, handleRemix, authPromptOpen, closeAuthPrompt } = useRemix({
    isAuthenticated,
  });

  const inspect = useInspectTemplate();

  return (
    <main className="app-shell templates-page">
      <RemixToast message={remixToast} />

      <TemplatesTopbar isAuthenticated={isAuthenticated} />

      <TemplatesHero templateCount={templates.length} totalRemixes={totalRemixes} />

      <TemplatesControls
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => fetchTemplates()}
        onSearchClear={clearSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

      {error && <div className="form-error page-error">{error}</div>}

      <TemplatesGrid
        loading={loading}
        templates={filteredTemplates}
        user={user}
        remixingId={remixingId}
        onInspect={inspect.openInspect}
        onRemix={handleRemix}
        onResetFilters={resetFilters}
      />

      <InspectCodeModal
        open={inspect.open}
        loading={inspect.loading}
        template={inspect.template}
        activeTab={inspect.activeTab}
        onTabChange={inspect.setActiveTab}
        copied={inspect.copied}
        onCopy={inspect.copyActiveTab}
        onClose={inspect.closeInspect}
        onRemix={(id, title) => {
          inspect.closeInspect();
          handleRemix(id, title);
        }}
      />

      <AuthPromptModal open={authPromptOpen} onClose={closeAuthPrompt} />
    </main>
  );
}
