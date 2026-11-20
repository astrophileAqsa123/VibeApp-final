import { FiX } from "react-icons/fi";

import "./FeedbackBanner.css";

export default function FeedbackBanner({ error, notice, onDismiss }) {
  if (!error && !notice) return null;

  return (
    <div
      className={`studio-feedback ${error ? "is-error" : "is-success"}`}
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      <span>{error || notice}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        <FiX />
      </button>
    </div>
  );
}
