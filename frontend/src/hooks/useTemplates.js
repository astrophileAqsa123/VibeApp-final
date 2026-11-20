import { useCallback, useEffect, useMemo, useState } from "react";
import { listGalleryTemplates } from "../api/projectApi";

/**
 * Templates list state: fetching, search, category, sort and derived values.
 */
export default function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular"); // "popular" | "newest" | "title"

  // `overrides` lets callers fetch with fresh values before state has updated
  const fetchTemplates = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      setError("");
      try {
        const data = await listGalleryTemplates({
          search,
          category: selectedCategory,
          sort: sortBy,
          ...overrides,
        });
        setTemplates(data.templates || []);
      } catch (err) {
        setError(err.message || "Failed to load templates.");
      } finally {
        setLoading(false);
      }
    },
    [search, selectedCategory, sortBy]
  );

  // Refetch when category or sort changes (search is submitted with Enter)
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortBy]);

  // Local filter as well, for an instant feel while typing
  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.trim().toLowerCase();
    return templates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        t.author?.name?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const totalRemixes = useMemo(
    () => templates.reduce((acc, t) => acc + (t.remixCount || 0), 0),
    [templates]
  );

  const clearSearch = () => {
    setSearch("");
    fetchTemplates({ search: "" });
  };

  const resetFilters = () => {
    setSearch("");
    if (selectedCategory !== "all") {
      setSelectedCategory("all"); // effect will refetch
    } else {
      fetchTemplates({ search: "", category: "all" });
    }
  };

  return {
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
  };
}
