import { FiCode, FiEye, FiMessageSquare } from "react-icons/fi";

import "./MobileTabs.css";

/** Bottom tab bar (sirf <= 960px par dikhta hai): Chat | Preview | Code */
export default function MobileTabs({ pane, activeTab, onChat, onStageTab }) {
  const isChat = pane === "chat";

  return (
    <nav className="studio-mobile-tabs" aria-label="Workspace sections">
      <button type="button" className={isChat ? "is-active" : ""} onClick={onChat}>
        <FiMessageSquare />
        <span>Chat</span>
      </button>
      <button
        type="button"
        className={!isChat && activeTab === "preview" ? "is-active" : ""}
        onClick={() => onStageTab("preview")}
      >
        <FiEye />
        <span>Preview</span>
      </button>
      <button
        type="button"
        className={!isChat && activeTab === "code" ? "is-active" : ""}
        onClick={() => onStageTab("code")}
      >
        <FiCode />
        <span>Code</span>
      </button>
    </nav>
  );
}
