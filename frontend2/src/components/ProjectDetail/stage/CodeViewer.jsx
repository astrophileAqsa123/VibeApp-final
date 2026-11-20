import { useState } from "react";
import { FiCheck, FiCode, FiCopy, FiDownload, FiZap } from "react-icons/fi";

import { copyToClipboard, downloadTextFile } from "../utils";
import "./CodeViewer.css";

const MAIN_FILE = "lib/main.dart";
const SQL_FILE = "schema.sql";

/** Code studio: file tabs, copy / download, and the code itself. */
export default function CodeViewer({
  code,
  files,
  codeFile,
  onSelectFile,
  isSupabaseProject,
  sql,
  supabaseTable,
  onNotice,
}) {
  const [copied, setCopied] = useState(false);

  const isSql = codeFile === SQL_FILE;
  const selectedFile = files.find((file) => file.path === codeFile);
  const content = isSql ? sql : selectedFile?.content || code;

  const handleCopy = async () => {
    await copyToClipboard(content);
    setCopied(true);
    onNotice(isSql ? "⚡ Supabase SQL copied to clipboard!" : "Dart code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (isSql) {
      downloadTextFile(`${supabaseTable || "schema"}.sql`, sql);
    } else {
      downloadTextFile(selectedFile?.path?.split("/").pop() || "main.dart", content);
    }
  };

  return (
    <div className="studio-code-container">
      <div className="studio-code-header">
        <div className="studio-code-file-tabs">
          <button
            type="button"
            className={`studio-code-file-tab ${codeFile === MAIN_FILE ? "is-active" : ""}`}
            onClick={() => onSelectFile(MAIN_FILE)}
          >
            <FiCode />
            <span>{MAIN_FILE}</span>
            <span className="studio-code-file-meta">({code.split("\n").length} lines)</span>
          </button>

          {files
            .filter((file) => file.path !== MAIN_FILE)
            .map((file) => (
              <button
                key={file.path}
                type="button"
                className={`studio-code-file-tab ${codeFile === file.path ? "is-active" : ""}`}
                onClick={() => onSelectFile(file.path)}
              >
                <FiCode />
                <span>{file.path}</span>
                <span className="studio-code-file-meta">
                  ({String(file.content || "").split("\n").length} lines)
                </span>
              </button>
            ))}

          {isSupabaseProject && (
            <button
              type="button"
              className={`studio-code-file-tab supabase-file-tab ${isSql ? "is-active" : ""}`}
              onClick={() => onSelectFile(SQL_FILE)}
            >
              <FiZap className="tab-zap" />
              <span>{SQL_FILE}</span>
              <span className="studio-code-file-badge">Supabase</span>
            </button>
          )}
        </div>

        <div className="studio-code-actions">
          <button type="button" className="studio-code-btn" onClick={handleCopy} aria-label={isSql ? "Copy SQL" : "Copy file"}>
            {copied ? <FiCheck className="studio-code-copied-icon" /> : <FiCopy />}
            <span>{copied ? "Copied" : isSql ? "Copy SQL" : "Copy File"}</span>
          </button>

          <button type="button" className="studio-code-btn" onClick={handleDownload} aria-label={isSql ? "Download SQL" : "Download file"}>
            <FiDownload />
            <span>{isSql ? "Download .sql" : "Download File"}</span>
          </button>
        </div>
      </div>

      <pre className="studio-code-pre">
        <code>{content}</code>
      </pre>
    </div>
  );
}
