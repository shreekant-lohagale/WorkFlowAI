import { Menu } from "lucide-react";

export default function Topbar({ title, description, apiStatus, onMenuClick }) {
  const isReady = apiStatus === "ready";

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="menu-button" type="button" onClick={onMenuClick} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <div className={`system-status ${isReady ? "ready" : "pending"}`} title="FastAPI health status">
          <span className="status-dot" />
          {isReady ? "AI System Ready" : apiStatus === "offline" ? "API Unavailable" : "Connecting"}
        </div>
        <span className="project-tag">SCCPL Project</span>
      </div>
    </header>
  );
}
