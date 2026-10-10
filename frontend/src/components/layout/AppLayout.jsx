import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getHealth } from "../../services/api";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const pageDetails = {
  "/": ["Dashboard", "AI-powered productivity workspace"],
  "/email": ["Email Assistant", "Professional communication workflow"],
  "/meetings": ["Meeting Summarizer", "Turn discussions into structured outcomes"],
  "/knowledge": ["Company Knowledge", "Trusted, source-grounded organizational intelligence"],
  "/actions": ["Action Items", "Extract clear ownership and next steps"],
  "/reports": ["Weekly Reports", "Create consistent stakeholder updates"],
  "/executive": ["Executive Summary", "Focused insights for decision-makers"],
  "/analytics": ["Productivity Analytics", "Understand workflow impact"],
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [title, description] = pageDetails[pathname] || pageDetails["/"];

  useEffect(() => {
    getHealth()
      .then(() => setApiStatus("ready"))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-column">
        <Topbar
          title={title}
          description={description}
          apiStatus={apiStatus}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
