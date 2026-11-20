import { useState } from "react";
import { FiArrowUp, FiMic, FiPlus } from "react-icons/fi";

import { QUICK_PROMPTS } from "../constants";
import "./PromptInput.css";

export default function PromptInput({ message, setMessage, updating, onSubmit, onVoice }) {
  const [showChips, setShowChips] = useState(false);

  return (
    <div className="studio-input-container">
      {showChips && (
        <div className="studio-quick-chips">
          {QUICK_PROMPTS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="studio-chip-btn"
              onClick={() => {
                setMessage(chip);
                setShowChips(false);
              }}
            >
              + {chip}
            </button>
          ))}
        </div>
      )}

      <form className="studio-input-box" onSubmit={onSubmit}>
        <textarea
          className="studio-prompt-textarea"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            // Touch device par Enter = naya line (send button se bhejein)
            const isTouch =
              typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !isTouch) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Make changes, add new features, ask for anything"
          disabled={updating}
        />

        <div className="studio-input-actions">
          <div className="studio-input-actions-left">
            <button
              type="button"
              className="studio-icon-btn"
              onClick={() => setShowChips((v) => !v)}
              title="Quick prompt suggestions"
            >
              <FiPlus />
            </button>
            <button
              type="button"
              className="studio-icon-btn"
              title="Voice input (coming soon)"
              onClick={onVoice}
            >
              <FiMic />
            </button>
          </div>

          <div className="studio-input-actions-right">
            <button
              type="submit"
              className="studio-submit-btn"
              disabled={!message.trim() || updating}
              title="Send prompt"
            >
              {updating ? <span className="studio-tips-spinner" /> : <FiArrowUp />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
