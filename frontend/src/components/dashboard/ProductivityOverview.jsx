import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

export default function ProductivityOverview({ summary }) {
  const hasData = Boolean(summary?.total_tests);
  const maximum = hasData ? Math.max(summary.total_manual_minutes, summary.total_ai_minutes) : 1;
  const saved = summary?.total_time_saved_minutes ?? 0;

  return (
    <section className="panel productivity-panel">
      <SectionHeader title="Productivity Overview" description="Manual and AI-assisted effort across recorded benchmark runs." meta={hasData ? `${summary.total_tests} measured runs` : "Awaiting measured data"} />
      {!hasData && <div className="dashboard-analytics-empty"><BarChart3 size={25} /><strong>No measured data yet</strong><p>Record manual and AI-assisted times in Productivity Analytics to populate this view.</p></div>}
      {hasData && <>
        <div className="comparison">
          <div className="comparison-row"><div><span>Manual workflow</span><strong>{summary.total_manual_minutes} min</strong></div><div className="track"><span className="manual-bar" style={{ width: `${(summary.total_manual_minutes / maximum) * 100}%` }} /></div></div>
          <div className="comparison-row"><div><span>AI-assisted</span><strong>{summary.total_ai_minutes} min</strong></div><div className="track"><span className="ai-bar" style={{ width: `${(summary.total_ai_minutes / maximum) * 100}%` }} /></div></div>
        </div>
        <div className="saving-summary">
          <div className={`saving-icon ${saved < 0 ? "negative" : ""}`}>{saved < 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}</div>
          <div><span>Measured time saved</span><strong>{saved} min</strong></div>
          <div className={`saving-percent ${saved < 0 ? "negative" : ""}`}>{summary.average_time_reduction_percent}% <span>measured time reduction</span></div>
        </div>
      </>}
    </section>
  );
}
