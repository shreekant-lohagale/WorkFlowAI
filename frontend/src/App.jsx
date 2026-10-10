import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ActionExtractor from "./pages/ActionExtractor";
import Dashboard from "./pages/Dashboard";
import EmailAssistant from "./pages/EmailAssistant";
import ExecutiveSummary from "./pages/ExecutiveSummary";
import MeetingSummarizer from "./pages/MeetingSummarizer";
import KnowledgeBase from "./pages/KnowledgeBase";
import WeeklyReport from "./pages/WeeklyReport";

const ProductivityAnalytics = lazy(() => import("./pages/ProductivityAnalytics"));

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/email" element={<EmailAssistant />} />
        <Route path="/meetings" element={<MeetingSummarizer />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/actions" element={<ActionExtractor />} />
        <Route path="/reports" element={<WeeklyReport />} />
        <Route path="/executive" element={<ExecutiveSummary />} />
        <Route path="/analytics" element={<Suspense fallback={<div className="route-loading">Loading analytics…</div>}><ProductivityAnalytics /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
