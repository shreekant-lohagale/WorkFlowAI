import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clipboard,
  Crosshair,
  FileText,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import { useState } from "react";
import { generateExecutiveSummary } from "../services/api";

const EMPTY_FORM = {
  summary_title: "Executive Project Brief",
  audience: "Senior Management",
  focus: "Balanced",
  detail_level: "Concise",
  source_content: "",
};

const DEMO_CONTENT = `NovaTech Client Dashboard — Weekly Update

The dashboard module has been completed and internal testing is in progress.

Eight UI defects were resolved this week and three minor defects remain open.

The tablet layout issue was fixed.

Payment API integration remains blocked because the required API credentials have not been received from the client.

The client team was requested to provide the credentials by Wednesday.

Final regression testing depends on payment integration being completed.

No release date has been confirmed.

The team plans to resume payment integration when the credentials are received.

Management has not been asked to approve a revised release date at this stage.`;

const statusValues = ["On Track", "At Risk", "Blocked", "Not specified"];
const severityValues = ["Low", "Medium", "High", "Critical", "Not specified"];
const responsibleControls = [
  "Critical facts remain source-grounded",
  "Metrics are never fabricated",
  "Risks are not exaggerated",
  "Decisions are only reported when supported",
  "Missing business context is surfaced",
  "Human approval required",
];

function ExecutiveList({ title, icon: Icon, items, editing, onChange, onAdd, onRemove, emptyText, tone = "" }) {
  return (
    <section className={`executive-list-section ${tone}`}>
      <header><Icon size={15} /><h3>{title}</h3><b>{items.length}</b></header>
      {items.length === 0 && <p className="executive-section-empty">{emptyText}</p>}
      <div className="executive-list">
        {items.map((item, index) => editing ? (
          <div className="executive-edit-row" key={`${title}-${index}`}>
            <textarea value={item} rows={2} onChange={(event) => onChange(index, event.target.value)} aria-label={`${title} item ${index + 1}`} />
            <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${title} item ${index + 1}`}><Trash2 size={13} /></button>
          </div>
        ) : <div className="executive-list-row" key={`${item}-${index}`}><span><Check size={12} /></span><p>{item}</p></div>)}
      </div>
      {editing && <button type="button" className="executive-add-button" onClick={onAdd}><Plus size={13} /> Add item</button>}
    </section>
  );
}

export default function ExecutiveSummary() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedByUser, setEditedByUser] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const markEdited = () => { setEditedByUser(true); setApproved(false); };

  const requestSummary = async () => {
    setLoading(true); setError(""); setEditing(false); setApproved(false); setCopyStatus("");
    try {
      const response = await generateExecutiveSummary(form);
      setSummary(response.summary); setEditedByUser(false);
    } catch (requestError) {
      setError(requestError.message || "The AI service could not generate the executive summary.");
    } finally { setLoading(false); }
  };

  const handleSubmit = (event) => { event.preventDefault(); requestSummary(); };
  const loadDemo = () => {
    setForm({ ...EMPTY_FORM, source_content: DEMO_CONTENT });
    setSummary(null); setError(""); setEditing(false); setEditedByUser(false); setApproved(false); setCopyStatus("");
  };
  const updateSummaryField = (field, value) => { setSummary((current) => ({ ...current, [field]: value })); markEdited(); };
  const updateList = (field, index, value) => { setSummary((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? value : item) })); markEdited(); };
  const removeListItem = (field, index) => { setSummary((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) })); markEdited(); };
  const addListItem = (field) => { setSummary((current) => ({ ...current, [field]: [...current[field], ""] })); markEdited(); };
  const listProps = (field) => ({ items: summary[field], editing, onChange: (index, value) => updateList(field, index, value), onRemove: (index) => removeListItem(field, index), onAdd: () => addListItem(field) });
  const updateRisk = (index, field, value) => { setSummary((current) => ({ ...current, key_risks: current.key_risks.map((risk, riskIndex) => riskIndex === index ? { ...risk, [field]: value } : risk) })); markEdited(); };
  const addRisk = () => { setSummary((current) => ({ ...current, key_risks: [...current.key_risks, { risk: "", impact: "Not specified", severity: "Not specified" }] })); markEdited(); };
  const removeRisk = (index) => { setSummary((current) => ({ ...current, key_risks: current.key_risks.filter((_, riskIndex) => riskIndex !== index) })); markEdited(); };
  const updateMetric = (index, field, value) => { setSummary((current) => ({ ...current, important_metrics: current.important_metrics.map((metric, metricIndex) => metricIndex === index ? { ...metric, [field]: value } : metric) })); markEdited(); };
  const addMetric = () => { setSummary((current) => ({ ...current, important_metrics: [...current.important_metrics, { label: "", value: "" }] })); markEdited(); };
  const removeMetric = (index) => { setSummary((current) => ({ ...current, important_metrics: current.important_metrics.filter((_, metricIndex) => metricIndex !== index) })); markEdited(); };

  const copySummary = async () => {
    if (!summary) return;
    const section = (title, items) => [title, ...(items.length ? items.map((item) => `- ${item}`) : ["- None specified"]), ""];
    const lines = [summary.summary_title.toUpperCase(), "", "Overall Status:", summary.overall_status, "", "Executive Summary:", summary.executive_summary, "",
      ...section("KEY PROGRESS", summary.key_progress),
      ...section("KEY RISKS", summary.key_risks.map((item) => `${item.risk} | Impact: ${item.impact} | Severity: ${item.severity}`)),
      ...section("IMPORTANT METRICS", summary.important_metrics.map((item) => `${item.label}: ${item.value}`)),
      ...section("DECISIONS REQUIRED", summary.decisions_required), ...section("IMMEDIATE PRIORITIES", summary.immediate_priorities),
      ...section("BUSINESS / CLIENT IMPACT", summary.client_or_business_impact), ...section("MISSING INFORMATION", summary.missing_information)];
    try { await navigator.clipboard.writeText(lines.join("\n").trim()); setCopyStatus("Copied"); window.setTimeout(() => setCopyStatus(""), 1800); }
    catch { setCopyStatus("Copy failed"); }
  };

  const startNew = () => {
    if ((summary || form.source_content) && !window.confirm("Start a new executive summary and clear the current content?")) return;
    setForm(EMPTY_FORM); setSummary(null); setError(""); setEditing(false); setEditedByUser(false); setApproved(false); setCopyStatus("");
  };

  return (
    <div className="executive-page">
      <header className="email-page-header executive-page-header">
        <div><span className="executive-workflow-tag"><BriefcaseBusiness size={13} /> Leadership</span><h1>Executive Summary</h1><p>Turn detailed project information into concise, decision-ready management intelligence.</p></div>
        <div className="review-reminder"><ShieldCheck size={17} /><span>Critical facts are compressed, never fabricated.</span></div>
      </header>

      <div className="executive-workspace">
        <section className="email-panel executive-input-panel">
          <div className="email-panel-heading"><div><span>01</span><h2>Source Input</h2></div><button type="button" className="text-action" onClick={loadDemo} disabled={loading}>Load Demo</button></div>
          <form className="email-form executive-form" onSubmit={handleSubmit}>
            <label className="form-field"><span>Summary Title</span><input name="summary_title" value={form.summary_title} onChange={updateField} maxLength={200} disabled={loading} /></label>
            <div className="form-row">
              <label className="form-field"><span>Audience <em>Required</em></span><select name="audience" value={form.audience} onChange={updateField} disabled={loading}><option>Senior Management</option><option>Project Manager</option><option>Team Lead</option><option>Leadership</option><option>Client Stakeholders</option><option>Business Decision-Makers</option></select></label>
              <label className="form-field"><span>Focus <em>Required</em></span><select name="focus" value={form.focus} onChange={updateField} disabled={loading}><option>Balanced</option><option>Risks &amp; Blockers</option><option>Progress &amp; Delivery</option><option>Decisions Required</option><option>Client Impact</option></select></label>
            </div>
            <label className="form-field"><span>Detail Level <em>Required</em></span><select name="detail_level" value={form.detail_level} onChange={updateField} disabled={loading}><option>Brief</option><option>Concise</option><option>Detailed</option></select></label>
            <label className="form-field executive-source-field"><span>Detailed Content <em>Required</em></span><textarea name="source_content" value={form.source_content} onChange={updateField} minLength={50} maxLength={25000} rows={23} required disabled={loading} placeholder="Paste a detailed report, project update, meeting summary, risk log, or combined workplace notes..." /><small>{form.source_content.length.toLocaleString()} / 25,000</small></label>
            <div className="form-actions"><button className="generate-button" type="submit" disabled={loading}>{loading ? <RefreshCw className="spin" size={17} /> : <Sparkles size={17} />}{loading ? "Generating summary..." : "Generate Summary"}</button><span>Temporary review session only.</span></div>
          </form>
        </section>

        <section className="email-panel executive-result-panel" aria-live="polite">
          <div className="email-panel-heading"><div><span>02</span><h2>Executive Brief</h2></div>{summary && <button type="button" className="text-action muted" onClick={startNew}><RotateCcw size={13} /> New Summary</button>}</div>
          {error && !loading && <div className="email-error" role="alert"><AlertCircle size={21} /><div><strong>Unable to generate the executive summary</strong><p>{error} Your source content has been preserved. Please try again.</p></div><button type="button" onClick={requestSummary}>Try Again</button></div>}
          {loading && <div className="draft-loading executive-loading"><div className="loading-mark"><BriefcaseBusiness size={23} /></div><strong>Prioritizing management intelligence</strong><p>Compressing progress, risks, metrics, impacts and explicit decisions without adding facts.</p><div className="loading-lines"><span /><span /><span /><span /></div></div>}
          {!summary && !loading && !error && <div className="draft-empty executive-empty"><div className="empty-mail"><FileText size={27} /></div><h3>Your executive brief will appear here</h3><p>Add project reports or workplace updates to generate a concise, management-ready summary.</p><div className="empty-steps"><span>Source</span><i /><span>Compress</span><i /><span>Review</span></div></div>}

          {summary && !loading && <div className="executive-result-content">
            <div className={`human-review-banner ${approved ? "approved" : ""}`}><div className="review-banner-icon">{approved ? <CheckCircle2 size={19} /> : <UserRoundCheck size={19} />}</div><div><strong>{approved ? "Human Approved" : "AI-Generated Executive Brief"}</strong><span>{approved ? "Reviewed and approved by the user" : "Human review required"}</span></div>{editedByUser && <span className="edited-badge"><Pencil size={11} /> Edited by user</span>}</div>
            <div className="executive-title-row"><div><small>MANAGEMENT BRIEF</small><h2>{summary.summary_title}</h2></div>{editing ? <select value={summary.overall_status} onChange={(event) => updateSummaryField("overall_status", event.target.value)}>{statusValues.map((value) => <option key={value}>{value}</option>)}</select> : <span className={`report-status status-${summary.overall_status.toLowerCase().replaceAll(" ", "-")}`}>{summary.overall_status}</span>}</div>
            <section className="executive-overview"><span><Sparkles size={14} /> Executive Summary</span>{editing ? <textarea value={summary.executive_summary} rows={5} onChange={(event) => updateSummaryField("executive_summary", event.target.value)} /> : <p>{summary.executive_summary}</p>}</section>

            <ExecutiveList title="Key Progress" icon={TrendingUp} {...listProps("key_progress")} emptyText="No management-relevant progress was explicitly supplied." tone="progress" />

            <section className="executive-risks"><header><AlertTriangle size={16} /><h3>Key Risks</h3><b>{summary.key_risks.length}</b></header>
              {summary.key_risks.length === 0 && <p className="executive-section-empty">No source-supported risks were identified.</p>}
              {summary.key_risks.map((item, index) => <article key={`executive-risk-${index}`}>{editing ? <><textarea value={item.risk} rows={2} onChange={(event) => updateRisk(index, "risk", event.target.value)} aria-label={`Risk ${index + 1}`} /><div><label>Impact<input value={item.impact} onChange={(event) => updateRisk(index, "impact", event.target.value)} /></label><label>Severity<select value={item.severity} onChange={(event) => updateRisk(index, "severity", event.target.value)}>{severityValues.map((value) => <option key={value}>{value}</option>)}</select></label><button type="button" onClick={() => removeRisk(index)} aria-label={`Remove risk ${index + 1}`}><Trash2 size={13} /></button></div></> : <><div className="executive-risk-title"><strong>{item.risk}</strong><span className={`severity-${item.severity.toLowerCase().replaceAll(" ", "-")}`}>{item.severity}</span></div><dl><dt>Impact</dt><dd>{item.impact}</dd></dl></>}</article>)}
              {editing && <button type="button" className="executive-add-button" onClick={addRisk}><Plus size={13} /> Add risk</button>}
            </section>

            <section className="executive-metrics"><header><BarChart3 size={15} /><h3>Important Metrics</h3><b>{summary.important_metrics.length}</b></header>
              {summary.important_metrics.length === 0 && <p className="executive-section-empty">No explicit management-relevant metrics were supplied.</p>}
              <div>{summary.important_metrics.map((item, index) => <article key={`executive-metric-${index}`}>{editing ? <><input value={item.label} onChange={(event) => updateMetric(index, "label", event.target.value)} aria-label={`Metric ${index + 1} label`} /><input value={item.value} onChange={(event) => updateMetric(index, "value", event.target.value)} aria-label={`Metric ${index + 1} value`} /><button type="button" onClick={() => removeMetric(index)}><Trash2 size={12} /></button></> : <><small>{item.label}</small><strong>{item.value}</strong></>}</article>)}</div>
              {editing && <button type="button" className="executive-add-button" onClick={addMetric}><Plus size={13} /> Add metric</button>}
            </section>

            <div className="executive-decision-grid">
              <ExecutiveList title="Decisions Required" icon={Lightbulb} {...listProps("decisions_required")} emptyText="No management decision requirement was identified." tone="decision" />
              <ExecutiveList title="Immediate Priorities" icon={Crosshair} {...listProps("immediate_priorities")} emptyText="No immediate priority was explicitly supported." tone="priority" />
            </div>
            <ExecutiveList title="Business / Client Impact" icon={BriefcaseBusiness} {...listProps("client_or_business_impact")} emptyText="Not specified" tone="impact" />
            <ExecutiveList title="Missing Information" icon={AlertCircle} {...listProps("missing_information")} emptyText="No material missing information was identified." tone="missing" />
            {summary.review_notes.length > 0 && <section className="executive-review-notes"><ShieldCheck size={15} /><div><strong>Review Notes</strong><ul>{summary.review_notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul></div></section>}

            <div className="draft-actions executive-result-actions"><button type="button" className="draft-button" onClick={() => setEditing((current) => !current)}>{editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? "Finish Editing" : "Edit Summary"}</button><button type="button" className="draft-button" onClick={requestSummary} disabled={editing}><RefreshCw size={15} /> Regenerate</button><button type="button" className="draft-button" onClick={copySummary} disabled={editing}><Clipboard size={15} /> {copyStatus || "Copy Executive Summary"}</button><button type="button" className="approve-button" onClick={() => setApproved(true)} disabled={approved || editing}><CheckCircle2 size={15} /> {approved ? "Human Approved" : "Approve Summary"}</button></div>
          </div>}
        </section>
      </div>

      <section className="email-responsible-note executive-responsible-note"><div><ShieldCheck size={20} /><span><strong>Responsible Executive Intelligence</strong><small>AI compresses. Humans decide.</small></span></div><ul>{responsibleControls.map((control) => <li key={control}><Check size={13} />{control}</li>)}</ul></section>
    </div>
  );
}
