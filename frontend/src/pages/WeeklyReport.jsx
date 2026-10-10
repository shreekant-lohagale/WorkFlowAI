import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Clipboard,
  FileChartColumnIncreasing,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { useState } from "react";
import { generateWeeklyReport } from "../services/api";

const EMPTY_FORM = {
  report_title: "Weekly Project Status",
  reporting_period: "5 Oct 2026 – 9 Oct 2026",
  audience: "Project Manager",
  source_type: "Weekly Activity Log",
  detail_level: "Standard",
  source_content: "",
};

const DEMO_CONTENT = `Project: NovaTech Client Dashboard

This week the dashboard module was completed and internal testing began.

Eight UI defects were fixed during testing. Three minor defects remain open.

Payment API integration is still blocked because client API credentials have not been received.

The frontend team fixed the tablet layout issue.

The client team was requested to provide API credentials by Wednesday.

The team discussed starting final regression testing after payment integration is complete.

No release date has been confirmed.

Next week, if the API credentials are received, the team plans to resume payment integration and continue regression testing.`;

const statusValues = ["On Track", "At Risk", "Blocked", "Not specified"];
const responsibleControls = [
  "Only supplied achievements are reported",
  "Metrics are never invented",
  "Completed and in-progress work remain separate",
  "Conditional plans remain conditional",
  "Missing information is surfaced",
  "Human approval required",
];

function EditableList({ title, icon: Icon, items, editing, onChange, onAdd, onRemove, emptyText, tone = "" }) {
  return (
    <section className={`report-list-section ${tone}`}>
      <header><Icon size={15} /><h3>{title}</h3><b>{items.length}</b></header>
      {items.length === 0 && <p className="report-section-empty">{emptyText}</p>}
      <div className="report-list">
        {items.map((item, index) => editing ? (
          <div className="report-edit-row" key={`${title}-${index}`}>
            <textarea value={item} rows={2} onChange={(event) => onChange(index, event.target.value)} aria-label={`${title} item ${index + 1}`} />
            <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${title} item ${index + 1}`}><Trash2 size={13} /></button>
          </div>
        ) : <div className="report-list-row" key={`${item}-${index}`}><span><Check size={12} /></span><p>{item}</p></div>)}
      </div>
      {editing && <button type="button" className="report-add-button" onClick={onAdd}><Plus size={13} /> Add item</button>}
    </section>
  );
}

export default function WeeklyReport() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedByUser, setEditedByUser] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const markEdited = () => { setEditedByUser(true); setApproved(false); };

  const requestReport = async () => {
    setLoading(true); setError(""); setEditing(false); setApproved(false); setCopyStatus("");
    try {
      const response = await generateWeeklyReport(form);
      setReport(response.report); setEditedByUser(false);
    } catch (requestError) {
      setError(requestError.message || "The AI service could not generate the weekly report.");
    } finally { setLoading(false); }
  };

  const handleSubmit = (event) => { event.preventDefault(); requestReport(); };
  const loadDemo = () => {
    setForm({ ...EMPTY_FORM, source_content: DEMO_CONTENT });
    setReport(null); setError(""); setEditing(false); setEditedByUser(false); setApproved(false); setCopyStatus("");
  };

  const updateReportField = (field, value) => { setReport((current) => ({ ...current, [field]: value })); markEdited(); };
  const updateList = (field, index, value) => { setReport((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? value : item) })); markEdited(); };
  const removeListItem = (field, index) => { setReport((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) })); markEdited(); };
  const addListItem = (field) => { setReport((current) => ({ ...current, [field]: [...current[field], ""] })); markEdited(); };
  const listProps = (field) => ({ items: report[field], editing, onChange: (index, value) => updateList(field, index, value), onRemove: (index) => removeListItem(field, index), onAdd: () => addListItem(field) });

  const updateRisk = (index, field, value) => { setReport((current) => ({ ...current, blockers_and_risks: current.blockers_and_risks.map((risk, riskIndex) => riskIndex === index ? { ...risk, [field]: value } : risk) })); markEdited(); };
  const addRisk = () => { setReport((current) => ({ ...current, blockers_and_risks: [...current.blockers_and_risks, { item: "", impact: "Not specified", owner: "Not specified" }] })); markEdited(); };
  const removeRisk = (index) => { setReport((current) => ({ ...current, blockers_and_risks: current.blockers_and_risks.filter((_, riskIndex) => riskIndex !== index) })); markEdited(); };
  const updateMetric = (index, field, value) => { setReport((current) => ({ ...current, metrics: current.metrics.map((metric, metricIndex) => metricIndex === index ? { ...metric, [field]: value } : metric) })); markEdited(); };
  const addMetric = () => { setReport((current) => ({ ...current, metrics: [...current.metrics, { label: "", value: "" }] })); markEdited(); };
  const removeMetric = (index) => { setReport((current) => ({ ...current, metrics: current.metrics.filter((_, metricIndex) => metricIndex !== index) })); markEdited(); };

  const copyReport = async () => {
    if (!report) return;
    const section = (title, items) => [title, ...(items.length ? items.map((item) => `- ${item}`) : ["- None specified"]), ""];
    const lines = [report.report_title.toUpperCase(), "", "Reporting Period:", report.reporting_period, "", "Overall Status:", report.overall_status, "", "Executive Overview:", report.executive_overview, "",
      ...section("COMPLETED WORK", report.completed_work), ...section("WORK IN PROGRESS", report.work_in_progress),
      ...section("BLOCKERS & RISKS", report.blockers_and_risks.map((risk) => `${risk.item} | Impact: ${risk.impact} | Owner: ${risk.owner}`)),
      ...section("METRICS", report.metrics.map((metric) => `${metric.label}: ${metric.value}`)),
      ...section("DECISIONS & UPDATES", report.decisions_and_updates), ...section("NEXT PERIOD PLAN", report.next_period_plan),
      ...section("MISSING INFORMATION", report.missing_information)];
    try { await navigator.clipboard.writeText(lines.join("\n").trim()); setCopyStatus("Copied"); window.setTimeout(() => setCopyStatus(""), 1800); }
    catch { setCopyStatus("Copy failed"); }
  };

  const startNew = () => {
    if ((report || form.source_content) && !window.confirm("Start a new report and clear the current content?")) return;
    setForm(EMPTY_FORM); setReport(null); setError(""); setEditing(false); setEditedByUser(false); setApproved(false); setCopyStatus("");
  };

  return (
    <div className="reports-page">
      <header className="email-page-header reports-page-header">
        <div><span className="report-workflow-tag"><FileChartColumnIncreasing size={13} /> Reporting</span><h1>Weekly Report Generator</h1><p>Transform raw project activity into clear, consistent stakeholder-ready status reporting.</p></div>
        <div className="review-reminder"><ShieldCheck size={17} /><span>Metrics and progress are never invented.</span></div>
      </header>

      <div className="reports-workspace">
        <section className="email-panel reports-input-panel">
          <div className="email-panel-heading"><div><span>01</span><h2>Report Input</h2></div><button type="button" className="text-action" onClick={loadDemo} disabled={loading}>Load Demo</button></div>
          <form className="email-form reports-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="form-field"><span>Report Title</span><input name="report_title" value={form.report_title} onChange={updateField} maxLength={200} disabled={loading} /></label>
              <label className="form-field"><span>Reporting Period</span><input name="reporting_period" value={form.reporting_period} onChange={updateField} maxLength={200} disabled={loading} /></label>
            </div>
            <div className="form-row">
              <label className="form-field"><span>Audience <em>Required</em></span><select name="audience" value={form.audience} onChange={updateField} disabled={loading}><option>Project Manager</option><option>Team Lead</option><option>Client</option><option>Senior Management</option><option>Internal Team</option><option>Other</option></select></label>
              <label className="form-field"><span>Source Type <em>Required</em></span><select name="source_type" value={form.source_type} onChange={updateField} disabled={loading}><option>Weekly Activity Log</option><option>Project Updates</option><option>Team Notes</option><option>Mixed Workplace Notes</option></select></label>
            </div>
            <label className="form-field"><span>Detail Level <em>Required</em></span><select name="detail_level" value={form.detail_level} onChange={updateField} disabled={loading}><option>Concise</option><option>Standard</option><option>Detailed</option></select></label>
            <label className="form-field report-source-field"><span>Weekly Activity <em>Required</em></span><textarea name="source_content" value={form.source_content} onChange={updateField} minLength={30} maxLength={20000} rows={22} required disabled={loading} placeholder="Paste weekly activity, completed work, progress, blockers, metrics, decisions, and confirmed or conditional next-period plans..." /><small>{form.source_content.length.toLocaleString()} / 20,000</small></label>
            <div className="form-actions"><button className="generate-button" type="submit" disabled={loading}>{loading ? <RefreshCw className="spin" size={17} /> : <Sparkles size={17} />}{loading ? "Generating report..." : "Generate Report"}</button><span>Temporary review session only.</span></div>
          </form>
        </section>

        <section className="email-panel reports-result-panel" aria-live="polite">
          <div className="email-panel-heading"><div><span>02</span><h2>Generated Report</h2></div>{report && <button type="button" className="text-action muted" onClick={startNew}><RotateCcw size={13} /> New Report</button>}</div>
          {error && !loading && <div className="email-error" role="alert"><AlertCircle size={21} /><div><strong>Unable to generate the weekly report</strong><p>{error} Your source content has been preserved. Please try again.</p></div><button type="button" onClick={requestReport}>Try Again</button></div>}
          {loading && <div className="draft-loading reports-loading"><div className="loading-mark"><FileChartColumnIncreasing size={23} /></div><strong>Structuring this week’s activity</strong><p>Separating completed work, progress, blockers, explicit metrics and plans.</p><div className="loading-lines"><span /><span /><span /><span /></div></div>}
          {!report && !loading && !error && <div className="draft-empty reports-empty"><div className="empty-mail"><FileChartColumnIncreasing size={27} /></div><h3>Your weekly report will appear here</h3><p>Add this week’s project activity to create a structured, reviewable status report.</p><div className="empty-steps"><span>Activity</span><i /><span>Generate</span><i /><span>Review</span></div></div>}

          {report && !loading && <div className="report-result-content">
            <div className={`human-review-banner ${approved ? "approved" : ""}`}><div className="review-banner-icon">{approved ? <CheckCircle2 size={19} /> : <UserRoundCheck size={19} />}</div><div><strong>{approved ? "Human Approved" : "AI-Generated Weekly Report"}</strong><span>{approved ? "Reviewed and approved by the user" : "Human review required"}</span></div>{editedByUser && <span className="edited-badge"><Pencil size={11} /> Edited by user</span>}</div>
            <div className="report-title-row"><div><small>{report.reporting_period}</small><h2>{report.report_title}</h2></div>{editing ? <select value={report.overall_status} onChange={(event) => updateReportField("overall_status", event.target.value)}>{statusValues.map((value) => <option key={value}>{value}</option>)}</select> : <span className={`report-status status-${report.overall_status.toLowerCase().replaceAll(" ", "-")}`}>{report.overall_status}</span>}</div>
            <section className="report-overview"><span><Sparkles size={14} /> Executive Overview</span>{editing ? <textarea value={report.executive_overview} rows={5} onChange={(event) => updateReportField("executive_overview", event.target.value)} /> : <p>{report.executive_overview}</p>}</section>

            <div className="report-work-grid">
              <EditableList title="Completed Work" icon={CheckCircle2} {...listProps("completed_work")} emptyText="No completed work was explicitly supplied." tone="completed" />
              <EditableList title="Work in Progress" icon={RefreshCw} {...listProps("work_in_progress")} emptyText="No work in progress was explicitly supplied." tone="progress" />
            </div>

            <section className="report-risks"><header><AlertTriangle size={16} /><h3>Blockers & Risks</h3><b>{report.blockers_and_risks.length}</b></header>
              {report.blockers_and_risks.length === 0 && <p className="report-section-empty">No blockers or risks were explicitly supplied.</p>}
              {report.blockers_and_risks.map((risk, index) => <article key={`risk-${index}`}>{editing ? <><textarea value={risk.item} rows={2} onChange={(event) => updateRisk(index, "item", event.target.value)} aria-label={`Blocker ${index + 1}`} /><div><label>Impact<input value={risk.impact} onChange={(event) => updateRisk(index, "impact", event.target.value)} /></label><label>Owner<input value={risk.owner} onChange={(event) => updateRisk(index, "owner", event.target.value)} /></label><button type="button" onClick={() => removeRisk(index)} aria-label={`Remove blocker ${index + 1}`}><Trash2 size={13} /></button></div></> : <><strong>{risk.item}</strong><dl><div><dt>Impact</dt><dd>{risk.impact}</dd></div><div><dt>Owner</dt><dd>{risk.owner}</dd></div></dl></>}</article>)}
              {editing && <button type="button" className="report-add-button" onClick={addRisk}><Plus size={13} /> Add blocker or risk</button>}
            </section>

            <section className="report-metrics"><header><BarChart3 size={15} /><h3>Explicit Metrics</h3><b>{report.metrics.length}</b></header>
              {report.metrics.length === 0 && <p className="report-section-empty">No explicit metrics were supplied.</p>}
              <div>{report.metrics.map((metric, index) => <article key={`metric-${index}`}>{editing ? <><input value={metric.label} onChange={(event) => updateMetric(index, "label", event.target.value)} aria-label={`Metric ${index + 1} label`} /><input value={metric.value} onChange={(event) => updateMetric(index, "value", event.target.value)} aria-label={`Metric ${index + 1} value`} /><button type="button" onClick={() => removeMetric(index)}><Trash2 size={12} /></button></> : <><small>{metric.label}</small><strong>{metric.value}</strong></>}</article>)}</div>
              {editing && <button type="button" className="report-add-button" onClick={addMetric}><Plus size={13} /> Add metric</button>}
            </section>

            <EditableList title="Decisions & Updates" icon={ListChecks} {...listProps("decisions_and_updates")} emptyText="No decisions or separate updates were supplied." />
            <EditableList title="Next Period Plan" icon={FileChartColumnIncreasing} {...listProps("next_period_plan")} emptyText="No confirmed next-period plan was supplied." tone="plan" />
            <EditableList title="Missing Information" icon={AlertCircle} {...listProps("missing_information")} emptyText="No material missing information was identified." tone="missing" />
            {report.review_notes.length > 0 && <section className="report-review-notes"><ShieldCheck size={15} /><div><strong>Review Notes</strong><ul>{report.review_notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul></div></section>}

            <div className="draft-actions report-result-actions"><button type="button" className="draft-button" onClick={() => setEditing((current) => !current)}>{editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? "Finish Editing" : "Edit Report"}</button><button type="button" className="draft-button" onClick={requestReport} disabled={editing}><RefreshCw size={15} /> Regenerate</button><button type="button" className="draft-button" onClick={copyReport} disabled={editing}><Clipboard size={15} /> {copyStatus || "Copy Report"}</button><button type="button" className="approve-button" onClick={() => setApproved(true)} disabled={approved || editing}><CheckCircle2 size={15} /> {approved ? "Human Approved" : "Approve Report"}</button></div>
          </div>}
        </section>
      </div>

      <section className="email-responsible-note reports-responsible-note"><div><ShieldCheck size={20} /><span><strong>Responsible Reporting</strong><small>AI structures. Humans verify.</small></span></div><ul>{responsibleControls.map((control) => <li key={control}><Check size={13} />{control}</li>)}</ul></section>
    </div>
  );
}
