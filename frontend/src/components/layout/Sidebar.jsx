import {
  BarChart3,
  BookOpenText,
  ClipboardList,
  FileChartColumnIncreasing,
  FileText,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const workspaceNavigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Email Assistant", path: "/email", icon: Mail },
  { label: "Meeting Summarizer", path: "/meetings", icon: MessageSquareText },
  { label: "Action Items", path: "/actions", icon: ClipboardList },
  { label: "Weekly Reports", path: "/reports", icon: FileChartColumnIncreasing },
  { label: "Executive Summary", path: "/executive", icon: FileText },
  { label: "Productivity Analytics", path: "/analytics", icon: BarChart3 },
];

const knowledgeNavigation = [
  { label: "Company Knowledge", path: "/knowledge", icon: BookOpenText },
];

function NavigationItems({ items, onClose }) {
  return items.map(({ label, path, icon: Icon }) => (
    <NavLink
      key={path}
      to={path}
      end={path === "/"}
      onClick={onClose}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  ));
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        onClick={onClose}
        aria-label="Close navigation"
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <strong>WorkFlowAI</strong>
            <span>AI Productivity</span>
          </div>
          <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          <NavigationItems items={workspaceNavigation} onClose={onClose} />
          <span className="nav-label knowledge-nav-label">Knowledge</span>
          <NavigationItems items={knowledgeNavigation} onClose={onClose} />
        </nav>

        <div className="sidebar-footer">
          <span className="footer-kicker">SCCPL Project</span>
          <span>Generative AI Training Program</span>
        </div>
      </aside>
    </>
  );
}
