import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getMobilePreview } from "../api/mobilePreviewApi";

function formatValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function fieldValue(item, field) {
  return formatValue(item?.[field.name]);
}

export default function MobilePreview() {
  const { sessionId } = useParams();
  const [preview, setPreview] = useState(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    getMobilePreview(sessionId)
      .then((data) => setPreview(data))
      .catch((requestError) => setError(requestError.message));
  }, [sessionId]);

  const schema = preview?.schema || {};
  const fields = schema.fields || [];
  const records = schema.data || [];
  const filteredRecords = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return records;
    return records.filter((record) => fields.some((field) => fieldValue(record, field).toLowerCase().includes(value)));
  }, [fields, query, records]);

  if (error) return <main className="mobile-error"><div><span className="mobile-logo">V/A</span><h1>Preview unavailable</h1><p>{error}</p><small>This mobile preview may have expired or the session may not exist.</small></div></main>;
  if (!preview) return <main className="mobile-loading"><span className="mobile-logo">V/A</span><p>Loading preview...</p></main>;

  const primary = schema.theme?.primary || "#087f73";
  const background = schema.theme?.background || "#f7f8f3";

  return <main className="mobile-preview" style={{ "--mobile-primary": primary, "--mobile-background": background }}>
    <div className="mobile-device-bar"><span className="mobile-logo">V/A</span><span>VibeApp preview</span><span className="live-dot">Live</span></div>
    <section className="mobile-hero"><small>Mobile preview</small><h1>{schema.title || "Your app"}</h1><p>{preview.prompt}</p></section>
    <section className="mobile-content"><div className="mobile-toolbar"><label className="mobile-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" /></label><button className="mobile-add" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "+ Add"}</button></div>
      {showForm && <form className="mobile-form" onSubmit={(event) => { event.preventDefault(); setShowForm(false); }}><strong>New record</strong>{fields.map((field) => <label key={field.name}>{field.label}<input required={field.required} type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"} value={form[field.name] || ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} /></label>)}<button className="mobile-submit">Save preview record</button></form>}
      <div className="mobile-summary"><strong>{filteredRecords.length}</strong><span>records in preview</span></div><div className="mobile-records">{filteredRecords.length ? filteredRecords.map((record, index) => <article className="mobile-record" key={record.id || index}><div className="record-heading"><strong>{fieldValue(record, fields[0]) || `Record ${index + 1}`}</strong><span>...</span></div>{fields.slice(1, 4).map((field) => <div className="record-field" key={field.name}><small>{field.label}</small><span>{fieldValue(record, field) || "-"}</span></div>)}</article>) : <div className="mobile-empty">No matching records yet.</div>}</div>
    </section><footer className="mobile-footer">Preview session expires {new Date(preview.expiresAt).toLocaleString()}</footer>
  </main>;
}
