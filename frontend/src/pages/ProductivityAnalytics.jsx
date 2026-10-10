import {
  AlertCircle,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Info,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createAnalyticsRecord, deleteAnalyticsRecord, getAnalyticsRecords, getAnalyticsSummary } from "../services/api";

const EMPTY_FORM = {
  workflow: "Email Assistant",
  sample_name: "",
  manual_time_minutes: "",
  ai_time_minutes: "",
  quality_score: "",
  corrections: "0",
  approved: false,
  notes: "",
};

const workflows = ["Email Assistant", "Meeting Summarizer", "Action Item Extractor", "Weekly Report Generator", "Executive Summary Generator"];
const shortWorkflow = (value) => value.replace(" Assistant", "").replace(" Summarizer", "").replace(" Generator", "").replace(" Item Extractor", " Items");
const formatNumber = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatPercent = (value) => `${formatNumber(value)}%`;

function AnalyticsKpi({ icon: Icon, label, value, detail, tone }) {
  return <article className={`analytics-kpi ${tone}`}><span><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

export default function ProductivityAnalytics() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshAnalytics = useCallback(async () => {
    const [recordData, summaryData] = await Promise.all([getAnalyticsRecords(), getAnalyticsSummary()]);
    setRecords(recordData.records); setSummary(summaryData);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getAnalyticsRecords(), getAnalyticsSummary()])
      .then(([recordData, summaryData]) => { if (active) { setRecords(recordData.records); setSummary(summaryData); } })
      .catch((requestError) => { if (active) setError(requestError.message || "Productivity analytics are unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const hasData = Boolean(summary?.total_tests);
  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const submitBenchmark = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await createAnalyticsRecord({
        ...form,
        manual_time_minutes: Number(form.manual_time_minutes),
        ai_time_minutes: Number(form.ai_time_minutes),
        quality_score: Number(form.quality_score),
        corrections: Number(form.corrections),
        notes: form.notes || null,
      });
      await refreshAnalytics();
      setForm(EMPTY_FORM); setSuccess("Benchmark saved. All analytics now reflect the new measured run.");
    } catch (requestError) {
      setError(requestError.message || "The benchmark could not be saved.");
    } finally { setSaving(false); }
  };

  const removeBenchmark = async (record) => {
    if (!window.confirm(`Delete the benchmark “${record.sample_name}”? This will update all measured analytics.`)) return;
    setDeletingId(record.record_id); setError(""); setSuccess("");
    try {
      await deleteAnalyticsRecord(record.record_id); await refreshAnalytics();
      setSuccess("Benchmark deleted. Aggregate metrics have been recalculated.");
    } catch (requestError) { setError(requestError.message || "The benchmark could not be deleted."); }
    finally { setDeletingId(""); }
  };

  const chartData = useMemo(() => (summary?.workflow_breakdown || []).map((item) => ({
    ...item,
    name: shortWorkflow(item.workflow),
  })), [summary]);

  const insights = useMemo(() => {
    if (!summary?.workflow_breakdown?.length) return [];
    const reduction = [...summary.workflow_breakdown].sort((a, b) => b.time_reduction_percent - a.time_reduction_percent)[0];
    const quality = [...summary.workflow_breakdown].sort((a, b) => b.average_quality_score - a.average_quality_score)[0];
    const corrections = [...summary.workflow_breakdown].sort((a, b) => b.average_corrections - a.average_corrections)[0];
    return [
      { label: "Highest Time Reduction", value: reduction.workflow, detail: formatPercent(reduction.time_reduction_percent), icon: TrendingDown },
      { label: "Highest Quality", value: quality.workflow, detail: `${formatNumber(quality.average_quality_score)}/100`, icon: Award },
      { label: "Needs Review", value: corrections.workflow, detail: `${formatNumber(corrections.average_corrections)} avg. corrections`, icon: Target },
    ];
  }, [summary]);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div><span className="analytics-workflow-tag"><BarChart3 size={13} /> Measured Performance</span><h1>Productivity Analytics</h1><p>Measure the real impact of AI-assisted workplace workflows.</p></div>
        <div className="analytics-proof-note"><ShieldCheck size={17} /><span>Results are calculated from recorded manual-vs-AI benchmark runs.</span></div>
      </header>

      {error && <div className="knowledge-alert error analytics-alert" role="alert"><AlertCircle size={18} /><span><strong>Analytics request failed</strong>{error}</span><button type="button" onClick={() => setError("")}>Dismiss</button></div>}
      {success && <div className="knowledge-alert success analytics-alert"><CheckCircle2 size={18} /><span><strong>Measurement updated</strong>{success}</span><button type="button" onClick={() => setSuccess("")}>Dismiss</button></div>}

      {loading && <section className="analytics-loading"><RefreshCw className="spin" size={22} /><strong>Loading measured performance</strong></section>}

      {!loading && hasData && <section className="analytics-kpi-grid" aria-label="Measured productivity KPIs">
        <AnalyticsKpi icon={FlaskConical} label="Benchmark Runs" value={summary.total_tests} detail="Recorded comparisons" tone="violet" />
        <AnalyticsKpi icon={Clock3} label="Time Saved" value={`${formatNumber(summary.total_time_saved_minutes)} min`} detail={`${formatNumber(summary.total_manual_minutes)} manual → ${formatNumber(summary.total_ai_minutes)} AI`} tone={summary.total_time_saved_minutes < 0 ? "red" : "blue"} />
        <AnalyticsKpi icon={TrendingDown} label="Time Reduction" value={formatPercent(summary.average_time_reduction_percent)} detail="Calculated from total times" tone={summary.average_time_reduction_percent < 0 ? "red" : "green"} />
        <AnalyticsKpi icon={Award} label="Average Quality" value={`${formatNumber(summary.average_quality_score)}%`} detail="Human evaluation score" tone="amber" />
        <AnalyticsKpi icon={CheckCircle2} label="Approval Rate" value={formatPercent(summary.approval_rate_percent)} detail={`${summary.total_corrections} total corrections`} tone="green" />
      </section>}

      {!loading && !hasData && <section className="analytics-empty-state">
        <div><BarChart3 size={28} /></div><span>NO MEASURED RESULTS</span><h2>No measured benchmark data yet</h2><p>Run the same workplace task manually and with WorkFlowAI, then record both times to measure actual productivity improvement.</p><button type="button" onClick={() => document.getElementById("benchmark-recorder")?.scrollIntoView({ behavior: "smooth" })}><Plus size={15} /> Record Benchmark</button>
      </section>}

      <div className="analytics-recorder-grid" id="benchmark-recorder">
        <section className="analytics-panel benchmark-recorder">
          <header><div><span>01</span><h2>Record Productivity Test</h2><p>Compare the same task completed manually and with WorkFlowAI.</p></div><FlaskConical size={20} /></header>
          <form onSubmit={submitBenchmark}>
            <div className="form-row">
              <label className="form-field"><span>Workflow <em>Required</em></span><select name="workflow" value={form.workflow} onChange={updateField} disabled={saving}>{workflows.map((workflow) => <option key={workflow}>{workflow}</option>)}</select></label>
              <label className="form-field"><span>Sample Name <em>Required</em></span><input name="sample_name" value={form.sample_name} onChange={updateField} minLength={2} maxLength={200} required disabled={saving} placeholder="Client Follow-up Email" /><small>Use a short, non-sensitive test identifier.</small></label>
            </div>
            <div className="analytics-measure-grid">
              <label className="form-field"><span>Manual Time <em>Minutes</em></span><input type="number" name="manual_time_minutes" value={form.manual_time_minutes} onChange={updateField} min="0.01" step="0.01" required disabled={saving} /></label>
              <label className="form-field"><span>AI-Assisted Time <em>Minutes</em></span><input type="number" name="ai_time_minutes" value={form.ai_time_minutes} onChange={updateField} min="0.01" step="0.01" required disabled={saving} /><small>Include generation, human review and correction time.</small></label>
              <label className="form-field"><span>Quality Score <em>0–100</em></span><input type="number" name="quality_score" value={form.quality_score} onChange={updateField} min="0" max="100" step="0.1" required disabled={saving} /></label>
              <label className="form-field"><span>Correction Count</span><input type="number" name="corrections" value={form.corrections} onChange={updateField} min="0" step="1" required disabled={saving} /></label>
            </div>
            <label className="analytics-approval-toggle"><input type="checkbox" name="approved" checked={form.approved} onChange={updateField} disabled={saving} /><span><b>{form.approved && <Check size={12} />}</b><strong>Human Approved</strong><small>Mark only if the final output was accepted after review.</small></span></label>
            <label className="form-field"><span>Notes <em>Optional</em></span><textarea name="notes" value={form.notes} onChange={updateField} maxLength={500} rows={3} disabled={saving} placeholder="Minor tone adjustment" /><small>{form.notes.length} / 500 · Do not enter confidential project content in benchmark notes.</small></label>
            <button className="generate-button analytics-save-button" type="submit" disabled={saving}>{saving ? <RefreshCw className="spin" size={16} /> : <Plus size={16} />}{saving ? "Saving benchmark..." : "Save Benchmark"}</button>
          </form>
        </section>

        <aside className="analytics-panel measurement-guide">
          <header><Info size={18} /><div><h2>Measurement Standard</h2><p>Comparable inputs make the result trustworthy.</p></div></header>
          <div className="definition-card"><Clock3 size={17} /><div><strong>AI-Assisted Time</strong><p>Includes generation, human review and all correction time—not API latency alone.</p></div></div>
          <div className="definition-card"><Award size={17} /><div><strong>Quality Score</strong><p>Reflect factual accuracy, completeness, relevance, clarity, tone and actionability.</p></div></div>
          <div className="quality-weights"><span><b>30%</b> Factual Accuracy</span><span><b>20%</b> Completeness</span><span><b>15%</b> Relevance</span><span><b>15%</b> Clarity</span><span><b>10%</b> Professional Tone</span><span><b>10%</b> Actionability</span></div>
          <p className="privacy-guidance"><ShieldCheck size={14} /> Store measurement metadata only. Never paste workplace content into notes.</p>
        </aside>
      </div>

      {hasData && <>
        <section className="analytics-section">
          <div className="analytics-section-heading"><div><span>02</span><h2>Measured Performance</h2><p>Totals by workflow; negative improvement remains visible.</p></div><small>{summary.best_workflow} leads measured reduction</small></div>
          <div className="analytics-chart-grid">
            <article className="analytics-chart-card"><header><h3>Manual vs AI-Assisted Time</h3><span>Total minutes by workflow</span></header><div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#6f7989", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#596373", fontSize: 8 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#11151e", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} /><Bar name="Manual" dataKey="manual_minutes" fill="#596579" radius={[5,5,0,0]} /><Bar name="AI-Assisted" dataKey="ai_minutes" fill="#7c5cfc" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div></article>
            <article className="analytics-chart-card"><header><h3>Measured Time Reduction by Workflow</h3><span>Percentage from total workflow times</span></header><div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#6f7989", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#596373", fontSize: 8 }} axisLine={false} tickLine={false} unit="%" /><Tooltip contentStyle={{ background: "#11151e", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, fontSize: 10 }} formatter={(value) => [`${value}%`, "Reduction"]} /><ReferenceLine y={0} stroke="rgba(255,255,255,.25)" /><Bar dataKey="time_reduction_percent" radius={[5,5,0,0]}>{chartData.map((item) => <Cell key={item.workflow} fill={item.time_reduction_percent < 0 ? "#f97066" : "#32d583"} />)}</Bar></BarChart></ResponsiveContainer></div></article>
          </div>
        </section>

        <section className="analytics-insights"><div className="analytics-section-heading"><div><span>03</span><h2>Measured Insights</h2><p>Deterministic observations calculated from benchmark data.</p></div><small>No AI commentary</small></div><div>{insights.map(({ label, value, detail, icon: Icon }) => <article key={label}><span><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}</div></section>

        <section className="analytics-panel workflow-performance"><div className="analytics-section-heading"><div><span>04</span><h2>Workflow Performance</h2><p>Aggregate evidence for each measured workflow.</p></div></div><div className="analytics-table-wrap"><table><thead><tr><th>Workflow</th><th>Runs</th><th>Manual</th><th>AI Time</th><th>Saved</th><th>Reduction</th><th>Quality</th><th>Approval</th><th>Corrections</th></tr></thead><tbody>{summary.workflow_breakdown.map((item) => <tr key={item.workflow}><td><strong>{item.workflow}</strong></td><td>{item.tests}</td><td>{formatNumber(item.manual_minutes)} min</td><td>{formatNumber(item.ai_minutes)} min</td><td className={item.time_saved_minutes < 0 ? "negative-value" : "positive-value"}>{formatNumber(item.time_saved_minutes)} min</td><td className={item.time_reduction_percent < 0 ? "negative-value" : "positive-value"}>{formatPercent(item.time_reduction_percent)}</td><td>{formatNumber(item.average_quality_score)}</td><td>{formatPercent(item.approval_rate_percent)}</td><td>{formatNumber(item.average_corrections)}</td></tr>)}</tbody></table></div></section>
      </>}

      <section className="analytics-panel benchmark-history">
        <div className="analytics-section-heading"><div><span>05</span><h2>Benchmark History</h2><p>Raw measurements and derived results for transparent review.</p></div><small>{records.length} {records.length === 1 ? "record" : "records"}</small></div>
        {records.length === 0 ? <div className="history-empty"><FlaskConical size={22} /><strong>No benchmark records</strong><p>Your first measured comparison will appear here.</p></div> : <div className="analytics-table-wrap"><table><thead><tr><th>Sample</th><th>Workflow</th><th>Manual</th><th>AI-Assisted</th><th>Saved</th><th>Reduction</th><th>Quality</th><th>Corrections</th><th>Approved</th><th>Date</th><th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.record_id}><td><strong>{record.sample_name}</strong>{record.notes && <small>{record.notes}</small>}</td><td>{record.workflow}</td><td>{formatNumber(record.manual_time_minutes)} min</td><td>{formatNumber(record.ai_time_minutes)} min</td><td className={record.time_saved_minutes < 0 ? "negative-value" : "positive-value"}>{formatNumber(record.time_saved_minutes)} min</td><td className={record.time_reduction_percent < 0 ? "negative-value" : "positive-value"}>{formatPercent(record.time_reduction_percent)}</td><td>{formatNumber(record.quality_score)}/100</td><td>{record.corrections}</td><td><span className={`approval-pill ${record.approved ? "yes" : "no"}`}>{record.approved ? "Yes" : "No"}</span></td><td>{new Date(record.measured_at).toLocaleDateString()}</td><td><button type="button" className="delete-benchmark" onClick={() => removeBenchmark(record)} disabled={deletingId === record.record_id} aria-label={`Delete ${record.sample_name}`}>{deletingId === record.record_id ? <RefreshCw className="spin" size={13} /> : <Trash2 size={13} />} Delete</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
