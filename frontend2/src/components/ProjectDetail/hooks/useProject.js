import { useEffect, useState } from "react";

import { getProject, getVersionDiff } from "../../../api/projectApi";

/**
 * Loads the project, tracks which version is selected, and derives everything
 * the UI needs to display for that version (code, prompt, files, SQL ...).
 */
export default function useProject(projectId, setError) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionDiff, setVersionDiff] = useState(null);

  useEffect(() => {
    getProject(projectId)
      .then((data) => setProject(data.project))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId, setError]);

  useEffect(() => {
    if (!selectedVersion || selectedVersion <= 1) {
      setVersionDiff(null);
      return;
    }
    getVersionDiff(projectId, selectedVersion - 1, selectedVersion)
      .then((data) => setVersionDiff(data.diff || null))
      .catch(() => setVersionDiff(null));
  }, [projectId, selectedVersion]);

  const code = project?.currentCode || "";
  const versions = project?.versions || [];

  // Derive version items for the prompt stream
  const versionList =
    versions.length > 0
      ? versions
      : project
      ? [{ version: 1, prompt: project.prompt, generatedCode: code, createdAt: project.createdAt }]
      : [];

  const activeSnapshot = versionList.find((v) => v.version === selectedVersion);
  const displayedCode = activeSnapshot?.generatedCode || code;
  const displayedPrompt = activeSnapshot?.prompt || project?.prompt || "";
  const displayedStorageMode = activeSnapshot?.storageMode || project?.storageMode || "local";
  const displayedTableName = activeSnapshot?.supabaseTable || project?.supabaseTable || "items";
  const displayedProjectFiles = activeSnapshot
    ? (Array.isArray(activeSnapshot.projectFiles) ? activeSnapshot.projectFiles : [])
    : (Array.isArray(project?.projectFiles) ? project.projectFiles : []);

  const isSupabaseProject =
    displayedStorageMode === "supabase" ||
    Boolean(!activeSnapshot && project?.supabaseUrl) ||
    Boolean(activeSnapshot ? activeSnapshot.tableSql : project?.tableSql) ||
    Boolean(displayedCode && (displayedCode.includes("supabase_flutter") || displayedCode.includes("Supabase.initialize")));

  const fallbackSql = `-- Create table for ${displayedTableName}
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
CREATE TABLE IF NOT EXISTS ${displayedTableName} (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE ${displayedTableName} ENABLE ROW LEVEL SECURITY;

-- Allow read and write access for development
CREATE POLICY "Allow all access" ON ${displayedTableName}
  FOR ALL USING (true) WITH CHECK (true);`;

  const snapshotSql = activeSnapshot?.tableSql || project?.tableSql || "";
  const currentTableSql = snapshotSql.trim() ? snapshotSql : fallbackSql;

  return {
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
  };
}
