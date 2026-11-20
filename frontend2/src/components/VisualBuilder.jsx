import { useState } from "react";

/* ─── Static option lists ──────────────────────────────────────────────────── */

const COLOR_SWATCHES = [
  { label: "Teal",   value: "teal",   hex: "#14B8A6" },
  { label: "Blue",   value: "blue",   hex: "#2563EB" },
  { label: "Green",  value: "green",  hex: "#10B981" },
  { label: "Purple", value: "purple", hex: "#8B5CF6" },
  { label: "Pink",   value: "pink",   hex: "#EC4899" },
  { label: "Orange", value: "orange", hex: "#F97316" },
  { label: "Red",    value: "red",    hex: "#EF4444" },
  { label: "Black Gold", value: "black and gold", hex: "#FACC15", dark: true },
  { label: "Black Cyan", value: "black and cyan", hex: "#00E5FF", dark: true },
  { label: "Minimal", value: "minimal light", hex: "#F8FAFC", border: true },
];

const UI_PRESETS = [
  { label: "Minimal",  value: "minimal",  icon: "◻", hint: "Clean and simple" },
  { label: "Modern",   value: "modern",   icon: "◆", hint: "Bold cards" },
  { label: "Business", value: "business", icon: "▦", hint: "Professional dashboard" },
  { label: "Soft",     value: "soft",     icon: "●", hint: "Rounded and friendly" },
  { label: "Compact",  value: "compact",  icon: "▤", hint: "Dense data UI" },
];

const LAYOUTS = [
  { label: "List",     value: "list view",     icon: "☰" },
  { label: "Grid",     value: "grid view",     icon: "⊞" },
  { label: "Table",    value: "table view",    icon: "⊟" },
  { label: "Timeline", value: "timeline view", icon: "⌚" },
  { label: "Board",    value: "board view",    icon: "⊡" },
  { label: "Compact",  value: "compact ui",    icon: "≡" },
];

const FONT_SIZES = [
  { label: "Small",  value: "small font size" },
  { label: "Medium", value: "medium font size" },
  { label: "Large",  value: "large font size" },
];

const COMMON_FIELDS = [
  { label: "Phone",       value: "phone" },
  { label: "Email",       value: "email" },
  { label: "Address",     value: "address" },
  { label: "Status",      value: "status" },
  { label: "Priority",    value: "priority" },
  { label: "Date",        value: "date" },
  { label: "Description", value: "description" },
  { label: "Notes",       value: "notes" },
  { label: "Amount",      value: "amount" },
  { label: "Quantity",    value: "quantity" },
  { label: "Category",    value: "category" },
  { label: "Age",         value: "age" },
  { label: "Image URL",   value: "image" },
];

const SCREENS = [
  { label: "Login screen",      value: "add login screen" },
  { label: "Signup screen",     value: "add signup screen" },
  { label: "Splash screen",     value: "add splash screen" },
  { label: "Onboarding",        value: "add onboarding screen" },
  { label: "Profile page",      value: "add profile page" },
  { label: "Settings page",     value: "add settings page" },
  { label: "Bottom navigation", value: "add bottom navigation" },
  { label: "Drawer menu",       value: "add drawer menu" },
];

/* ─── Section toggle helper ─────────────────────────────────────────────────── */

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="vb-section">
      <button className="vb-section-head" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <span className="vb-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="vb-section-body">{children}</div>}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */

export default function VisualBuilder({ onApply, applying }) {
  // Theme
  const [activeColor, setActiveColor] = useState(null);
  const [uiPreset, setUiPreset] = useState(null);
  // Layout
  const [activeLayout, setActiveLayout] = useState(null);
  // Fields
  const [addFields, setAddFields]     = useState([]);
  const [removeField, setRemoveField] = useState("");
  const [renameFrom, setRenameFrom]   = useState("");
  const [renameTo, setRenameTo]       = useState("");
  const [customField, setCustomField] = useState("");
  // Typography
  const [fontSize, setFontSize]       = useState(null);
  const [boldTitle, setBoldTitle]     = useState(false);
  // App info
  const [appTitle, setAppTitle]       = useState("");
  const [appLogo, setAppLogo]         = useState("");
  // Extra screens
  const [activeScreen, setActiveScreen] = useState(null);
  // Role-based app
  const [roleBased, setRoleBased] = useState(false);
  const [roleNames, setRoleNames] = useState("");
  const [allowRoleSignup, setAllowRoleSignup] = useState(true);
  // UI tweaks
  const [cardElevation, setCardElevation] = useState("");
  const [borderRadius, setBorderRadius]   = useState("");
  const [appBarColor, setAppBarColor]     = useState("");

  /* Build the natural-language instruction string from all active controls */
  function buildInstruction() {
    const parts = [];

    if (activeColor)    parts.push(`change theme to ${activeColor}`);
    if (uiPreset)       parts.push(`change ui template to ${uiPreset}`);
    if (activeLayout)   parts.push(`change layout to ${activeLayout}`);
    if (addFields.length > 0) parts.push(`add ${addFields.join(", ")} field${addFields.length > 1 ? "s" : ""}`);
    if (customField.trim()) parts.push(`add ${customField.trim()} field`);
    if (removeField.trim()) parts.push(`remove ${removeField.trim()} field`);
    if (renameFrom.trim() && renameTo.trim()) parts.push(`rename ${renameFrom.trim()} field to ${renameTo.trim()}`);
    if (fontSize)       parts.push(`use ${fontSize}`);
    if (boldTitle)      parts.push("make title bold");
    if (appTitle.trim()) parts.push(`change app name to ${appTitle.trim()}`);
    if (appLogo.trim()) parts.push(`change logo to ${appLogo.trim()}`);
    if (activeScreen)   parts.push(activeScreen);
    if (roleBased) {
      const roles = roleNames.split(",").map((role) => role.trim()).filter(Boolean).join(", ");
      parts.push(roles ? `enable role-based authentication with roles: ${roles}${allowRoleSignup ? " with signup" : " login only"}` : `enable role-based authentication and infer domain-specific roles from the app context${allowRoleSignup ? " with signup" : " login only"}`);
    }
    if (cardElevation.trim()) parts.push(`set card elevation to ${cardElevation.trim()}`);
    if (borderRadius.trim())  parts.push(`set border radius to ${borderRadius.trim()}`);
    if (appBarColor.trim())   parts.push(`change app bar color to ${appBarColor.trim()}`);

    return parts.join("; ");
  }

  function handleApply() {
    const instruction = buildInstruction();
    if (!instruction) return;
    onApply(instruction);
  }

  function toggleField(val) {
    setAddFields((prev) =>
      prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]
    );
  }

  const instruction = buildInstruction();
  const hasChanges  = instruction.length > 0;

  return (
    <div className="visual-builder">
      <div className="vb-header">
        <span className="vb-title">Visual Builder</span>
        <span className="vb-subtitle">Click controls → Apply changes</span>
      </div>

      {/* ── Theme ── */}
      <Section title="Theme & Color">
        <div className="vb-swatches">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c.value}
              title={c.label}
              className={`vb-swatch ${activeColor === c.value ? "active" : ""} ${c.dark ? "dark-swatch" : ""} ${c.border ? "border-swatch" : ""}`}
              style={{ "--swatch-color": c.hex }}
              onClick={() => setActiveColor(activeColor === c.value ? null : c.value)}
            >
              <span className="vb-swatch-dot" />
              <span className="vb-swatch-label">{c.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Design Template ── */}
      <Section title="Design Template">
        <p className="vb-hint">Same components, different visual system</p>
        <div className="vb-chip-row">
          {UI_PRESETS.map((preset) => (
            <button
              key={preset.value}
              title={preset.hint}
              className={`vb-chip ${uiPreset === preset.value ? "active" : ""}`}
              onClick={() => setUiPreset(uiPreset === preset.value ? null : preset.value)}
            >
              {preset.icon} {preset.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Layout ── */}
      <Section title="Layout">
        <div className="vb-chip-row">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              className={`vb-chip ${activeLayout === l.value ? "active" : ""}`}
              onClick={() => setActiveLayout(activeLayout === l.value ? null : l.value)}
            >
              {l.icon} {l.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Fields ── */}
      <Section title="Fields">
        <p className="vb-hint">Toggle to add fields to the form</p>
        <div className="vb-chip-row">
          {COMMON_FIELDS.map((f) => (
            <button
              key={f.value}
              className={`vb-chip ${addFields.includes(f.value) ? "active" : ""}`}
              onClick={() => toggleField(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="vb-row">
          <input
            className="vb-input"
            placeholder="Custom field name…"
            value={customField}
            onChange={(e) => setCustomField(e.target.value)}
          />
        </div>
        <div className="vb-row vb-inline">
          <input
            className="vb-input"
            placeholder="Remove field (e.g. age)"
            value={removeField}
            onChange={(e) => setRemoveField(e.target.value)}
          />
        </div>
        <div className="vb-row vb-inline">
          <input
            className="vb-input"
            placeholder="Rename: from"
            value={renameFrom}
            onChange={(e) => setRenameFrom(e.target.value)}
          />
          <span className="vb-arrow">→</span>
          <input
            className="vb-input"
            placeholder="to"
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
          />
        </div>
      </Section>

      {/* ── Typography ── */}
      <Section title="Typography">
        <div className="vb-chip-row">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              className={`vb-chip ${fontSize === f.value ? "active" : ""}`}
              onClick={() => setFontSize(fontSize === f.value ? null : f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="vb-checkbox-row">
          <input
            type="checkbox"
            checked={boldTitle}
            onChange={(e) => setBoldTitle(e.target.checked)}
          />
          Bold card titles
        </label>
      </Section>

      {/* ── App Info ── */}
      <Section title="App Info">
        <div className="vb-row">
          <label className="vb-label">App name</label>
          <input
            className="vb-input"
            placeholder="e.g. My Inventory"
            value={appTitle}
            onChange={(e) => setAppTitle(e.target.value)}
          />
        </div>
        <div className="vb-row">
          <label className="vb-label">Logo / emoji</label>
          <input
            className="vb-input"
            placeholder="e.g. 📦 or student"
            value={appLogo}
            onChange={(e) => setAppLogo(e.target.value)}
          />
        </div>
      </Section>

      {/* ── Role-based App ── */}
      <Section title="Role-based App">
        <label className="vb-checkbox-row">
          <input
            type="checkbox"
            checked={roleBased}
            onChange={(e) => setRoleBased(e.target.checked)}
          />
          Enable login with role-specific dashboards
        </label>
        {roleBased && (
          <>
            <div className="vb-row">
              <label className="vb-label">Roles (comma separated)</label>
              <input
                className="vb-input"
                placeholder="e.g. Patient, Doctor, Admin — or leave blank to infer"
                value={roleNames}
                onChange={(e) => setRoleNames(e.target.value)}
              />
            </div>
            <label className="vb-checkbox-row">
              <input
                type="checkbox"
                checked={allowRoleSignup}
                onChange={(e) => setAllowRoleSignup(e.target.checked)}
              />
              Allow signup for non-admin roles
            </label>
            <p className="vb-hint">Admin/Owner/Super roles are excluded from public signup in generated local apps.</p>
          </>
        )}
      </Section>

      {/* ── UI Tweaks ── */}
      <Section title="UI Tweaks">
        <div className="vb-row">
          <label className="vb-label">Card elevation (0–8)</label>
          <input
            className="vb-input"
            type="number"
            min="0"
            max="8"
            placeholder="e.g. 4"
            value={cardElevation}
            onChange={(e) => setCardElevation(e.target.value)}
          />
        </div>
        <div className="vb-row">
          <label className="vb-label">Border radius (px)</label>
          <input
            className="vb-input"
            type="number"
            min="0"
            max="40"
            placeholder="e.g. 16"
            value={borderRadius}
            onChange={(e) => setBorderRadius(e.target.value)}
          />
        </div>
        <div className="vb-row">
          <label className="vb-label">AppBar color</label>
          <input
            className="vb-input"
            placeholder="e.g. indigo"
            value={appBarColor}
            onChange={(e) => setAppBarColor(e.target.value)}
          />
        </div>
      </Section>

      {/* ── Extra Screens ── */}
      <Section title="Screens">
        <div className="vb-chip-row">
          {SCREENS.map((s) => (
            <button
              key={s.value}
              className={`vb-chip ${activeScreen === s.value ? "active" : ""}`}
              onClick={() => setActiveScreen(activeScreen === s.value ? null : s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Preview & Apply ── */}
      <div className="vb-footer">
        {hasChanges && (
          <div className="vb-preview-instruction">
            <span className="vb-preview-label">Will send:</span>
            <span className="vb-preview-text">{instruction}</span>
          </div>
        )}
        <button
          className="vb-apply-btn"
          onClick={handleApply}
          disabled={!hasChanges || applying}
        >
          {applying ? "Applying…" : "Apply changes"}
          {!applying && <span>↗</span>}
        </button>
      </div>
    </div>
  );
}
