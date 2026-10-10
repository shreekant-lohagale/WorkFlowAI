import { BarChart3, BrainCircuit, CheckCircle2, Clock3, FlaskConical, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Badge from "../components/common/Badge";
import SectionHeader from "../components/common/SectionHeader";
import MetricCard from "../components/dashboard/MetricCard";
import ProductivityOverview from "../components/dashboard/ProductivityOverview";
import RecentActivity from "../components/dashboard/RecentActivity";
import ResponsibleAI from "../components/dashboard/ResponsibleAI";
import WorkflowCard from "../components/dashboard/WorkflowCard";
import { activity, workflows } from "../data/dashboardData";
import { getAnalyticsSummary } from "../services/api";

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let active = true;
    getAnalyticsSummary().then((data) => { if (active) setAnalytics(data); }).catch(() => { if (active) setAnalytics(null); });
    return () => { active = false; };
  }, []);

  const hasMeasuredData = Boolean(analytics?.total_tests);
  const measuredMetrics = [
    { label: "Benchmark Runs", value: hasMeasuredData ? String(analytics.total_tests) : "—", detail: hasMeasuredData ? "Measured comparisons" : "No measured data yet", icon: FlaskConical, tone: "violet" },
    { label: "Measured Time Saved", value: hasMeasuredData ? `${analytics.total_time_saved_minutes} min` : "—", detail: hasMeasuredData ? `${analytics.average_time_reduction_percent}% reduction` : "No measured data yet", icon: Clock3, tone: "blue" },
    { label: "Average Quality", value: hasMeasuredData ? `${analytics.average_quality_score}%` : "—", detail: hasMeasuredData ? "Recorded evaluations" : "No measured data yet", icon: BarChart3, tone: "green" },
    { label: "Human Approval Rate", value: hasMeasuredData ? `${analytics.approval_rate_percent}%` : "—", detail: hasMeasuredData ? `${analytics.total_tests} benchmark runs` : "No measured data yet", icon: CheckCircle2, tone: "amber" },
  ];

  return (
    <div className="dashboard-page">
      <section className="hero-section">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow">AI WORKSPACE</span>
          <h1>Transform work.<br /><span>Keep humans in control.</span></h1>
          <p>Structured AI workflows for communication, meetings, reporting, task extraction and management summaries.</p>
          <div className="hero-badges">
            <Badge icon={UserCheck}>Human-in-the-loop</Badge>
            <Badge icon={BrainCircuit}>5 AI workflows</Badge>
            <Badge icon={ShieldCheck}>Responsible AI</Badge>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="ai-core"><BrainCircuit size={30} /></div>
          <span className="node node-one" /><span className="node node-two" /><span className="node node-three" />
        </div>
      </section>

      <div className="metrics-heading"><span>Measured workspace impact</span><small>{hasMeasuredData ? "Calculated from recorded benchmarks" : "No measured benchmark data yet"}</small></div>
      <section className="metrics-grid" aria-label="Measured productivity metrics">
        {measuredMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="workflow-section">
        <SectionHeader title="AI Workflows" description="Purpose-built tools for the work your team repeats every week." />
        <div className="workflow-grid">{workflows.map((workflow) => <WorkflowCard key={workflow.title} workflow={workflow} />)}</div>
      </section>

      <div className="insights-grid"><ProductivityOverview summary={analytics} /><ResponsibleAI /></div>
      <RecentActivity items={activity} />
    </div>
  );
}
