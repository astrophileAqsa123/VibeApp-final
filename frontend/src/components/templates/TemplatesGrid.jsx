import TemplateCard from "./TemplateCard";

export default function TemplatesGrid({
  loading,
  templates,
  user,
  remixingId,
  onInspect,
  onRemix,
  onResetFilters,
}) {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="ticker-pulse-dot" style={{ margin: "0 auto" }} />
        <strong>Loading templates gallery…</strong>
        <span>Fetching community projects and starter builds</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="empty-state">
        <strong>No templates found.</strong>
        <span>Try adjusting your search keywords or choosing another category.</span>
        <button
          type="button"
          className="primary-link"
          style={{ marginTop: 12 }}
          onClick={onResetFilters}
        >
          Reset Filters
        </button>
      </div>
    );
  }

  return (
    <div className="templates-grid">
      {templates.map((item) => (
        <TemplateCard
          key={item._id}
          item={item}
          user={user}
          isRemixing={remixingId === item._id}
          onInspect={onInspect}
          onRemix={onRemix}
        />
      ))}
    </div>
  );
}
