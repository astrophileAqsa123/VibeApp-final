import { FiSearch, FiX } from "react-icons/fi";

import "./TemplatesControls.css";

export default function TemplatesControls({
  search,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  sortBy,
  onSortChange,
}) {
  return (
    <section className="templates-controls">
      <div className="templates-search-wrapper">
        <FiSearch className="templates-search-icon" />
        <input
          type="text"
          placeholder="Search templates by title, keyword, author, or tags..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchSubmit();
          }}
        />
        {search && (
          <button type="button" className="templates-search-clear" onClick={onSearchClear}>
            <FiX />
          </button>
        )}
      </div>

      <div className="templates-sort-group">
        <label htmlFor="sort-select">Sort by:</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="templates-sort-select"
        >
          <option value="popular">Most Remixed</option>
          <option value="newest">Recently Published</option>
          <option value="title">Alphabetical</option>
        </select>
      </div>
    </section>
  );
}
