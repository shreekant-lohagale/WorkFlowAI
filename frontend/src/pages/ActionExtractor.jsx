import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  FileText,
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
import { extractActions } from "../services/api";

const EMPTY_FORM = { source_type: "Meeting Notes", extraction_style: "Standard", content: "" };
const DEMO_CONTENT = `The dashboard testing is complete.

Payment integration cannot continue until API credentials are received.

Priya asked the client team to provide the credentials by Wednesday.

Rahul will fix the tablet layout issue before the next internal review.

The project manager asked Neha to prepare the revised project status report by Friday.

The team discussed using Friday as the release date but made no decision.

Someone should review the user documentation.`;

const responsibleControls = [
  "Only explicit responsibilities become tasks",
  "Missing owners are shown as Not specified",
  "Missing deadlines are not invented",
  "Discussions remain separate from commitments",
  "Human approval required",
];

const priorities = ["High", "Medium", "Low", "Not specified"];
const statuses = ["Open", "In Progress", "Blocked", "Completed", "Not specified"];

export default function ActionExtractor() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedByUser, setEditedByUser] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const requestExtraction = async () => {
    setLoading(true); setError(""); setApproved(false); setEditing(false); setCopyStatus("");
    try {
      const response = await extractActions(form);
      setResult(response.result);
      setEditedByUser(false);
    } catch (requestError) {
      setError(requestError.message || "The AI service could not extract action items. Your source content has been preserved.");
    } finally { setLoading(false); }
  };

  const handleSubmit = (event) => { event.preventDefault(); requestExtraction(); };

  const loadDemo = () => {
    setForm({ source_type: "Meeting Notes", extraction_style: "Standard", content: DEMO_CONTENT });
    setResult(null); setError(""); setEditing(false); setEditedByUser(false); setApproved(false); setCopyStatus("");
  };

  const markEdited = () => { setEditedByUser(true); setApproved(false); };

  const updateAction = (index, field, value) => {
    setResult((current) => ({ ...current, action_items: current.action_items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
    markEdited();
  };

  const removeAction = (index) => {
    setResult((current) => ({ ...current, action_items: current.action_items.filter((_, itemIndex) => itemIndex !== index) }));
    markEdited();
  };

  const addAction = () => {
    setResult((current) => ({ ...current, action_items: [...current.action_items, { task: "", owner: "Not specified", deadline: "Not specified", priority: "Not specified", dependency: "Not specified", status: "Open", evidence: "Added by user during review." }] }));
    setEditing(true); markEdited();
  };

  const copyActions = async () => {
    if (!result) return;
    const lines = ["ACTION ITEMS", ""];
    result.action_items.forEach((item, index) => lines.push(`${index + 1}. ${item.task}\nOwner: ${item.owner}\nDeadline: ${item.deadline}\nPriority: ${item.priority}\nDependency: ${item.dependency}\nStatus: ${item.status}`, ""));
    try { await navigator.clipboard.writeText(lines.join("\n").trim()); setCopyStatus("Copied"); window.setTimeout(() => setCopyStatus(""), 1800); }
    catch { setCopyStatus("Copy failed"); }
  };

  const startNew = () => {
    if ((result || form.content) && !window.confirm("Start a new extraction and clear the current content?")) return;
    setForm(EMPTY_FORM); setResult(null); setError(""); setEditing(false); setEditedByUser(false); setApproved(false); setCopyStatus("");
  };

  return (
    <div className="actions-page">
      <header className="email-page-header actions-page-header">
        <div><span className="action-workflow-tag"><ClipboardList size={13} /> Operations</span><h1>Action Item Extractor</h1><p>Turn workplace conversations and notes into clear, reviewable responsibilities.</p></div>
        <div className="review-reminder"><ShieldCheck size={17} /><span>Missing owners and deadlines are never invented.</span></div>
      </header>

      <div className="actions-workspace">
        <section className="email-panel actions-input-panel">
          <div className="email-panel-heading"><div><span>01</span><h2>Source</h2></div><button type="button" className="text-action" onClick={loadDemo} disabled={loading}>Load Demo</button></div>
          <form className="email-form actions-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="form-field"><span>Source Type <em>Required</em></span><select name="source_type" value={form.source_type} onChange={updateField} disabled={loading}><option>Meeting Notes</option><option>Email</option><option>Project Update</option><option>Chat / Discussion</option><option>General Notes</option></select></label>
              <label className="form-field"><span>Extraction Style <em>Required</em></span><select name="extraction_style" value={form.extraction_style} onChange={updateField} disabled={loading}><option>Concise</option><option>Standard</option><option>Detailed</option></select></label>
            </div>
            <label className="form-field action-content-field"><span>Workplace Content <em>Required</em></span><textarea name="content" value={form.content} onChange={updateField} minLength={20} maxLength={15000} rows={21} required disabled={loading} placeholder={"Paste workplace notes, meeting content, email text or project updates here...\n\nExample:\nThe payment integration remains blocked because API credentials are pending.\n\nPriya asked the client team to provide the credentials by Wednesday.\n\nRahul will fix the tablet layout issue before the next review.\n\nThe team discussed Friday as a possible release date but did not assign any release-related action."} /><small>{form.content.length.toLocaleString()} / 15,000</small></label>
            <div className="form-actions"><button className="generate-button" type="submit" disabled={loading}>{loading ? <RefreshCw className="spin" size={17} /> : <Sparkles size={17} />}{loading ? "Extracting actions..." : "Extract Actions"}</button><span>Temporary review session only.</span></div>
          </form>
        </section>

        <section className="email-panel actions-result-panel" aria-live="polite">
          <div className="email-panel-heading"><div><span>02</span><h2>Extracted Actions</h2></div>{result && <button type="button" className="text-action muted" onClick={startNew}><RotateCcw size={13} /> New Extraction</button>}</div>
          {error && !loading && <div className="email-error" role="alert"><AlertCircle size={21} /><div><strong>Unable to extract action items</strong><p>{error} Your source content has been preserved.</p></div><button type="button" onClick={requestExtraction}>Try Again</button></div>}
          {loading && <div className="draft-loading actions-loading"><div className="loading-mark"><ListChecks size={23} /></div><strong>Finding genuine responsibilities</strong><p>Separating commitments and requests from discussion or background information.</p><div className="loading-lines"><span /><span /><span /><span /></div></div>}
          {!result && !loading && !error && <div className="draft-empty actions-empty"><div className="empty-mail"><ClipboardList size={27} /></div><h3>Your action items will appear here</h3><p>Add workplace content to identify responsibilities, owners, deadlines and unresolved ambiguity.</p><div className="empty-steps"><span>Source</span><i /><span>Extract</span><i /><span>Review</span></div></div>}

          {result && !loading && <div className="actions-result-content">
            <div className={`human-review-banner ${approved ? "approved" : ""}`}><div className="review-banner-icon">{approved ? <CheckCircle2 size={19} /> : <UserRoundCheck size={19} />}</div><div><strong>{approved ? "Human Approved" : "AI-extracted actions"}</strong><span>{approved ? "Reviewed and approved by the user" : "Human review required before use"}</span></div>{editedByUser && <span className="edited-badge"><Pencil size={11} /> Edited by user</span>}</div>
            <section className="action-summary"><span><Sparkles size={14} /> Extraction Summary</span><p>{result.summary}</p><b>{result.action_items.length} {result.action_items.length === 1 ? "ACTION" : "ACTIONS"}</b></section>

            <div className="extracted-action-list">
              {result.action_items.length === 0 && <div className="no-actions-state"><CheckCircle2 size={21} /><strong>No explicit action items found</strong><p>Discussion and informational content were not converted into unsupported tasks.</p></div>}
              {result.action_items.map((item, index) => <article className="extracted-action-card" key={`action-${index}`}>
                <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>TASK</small>{editing ? <textarea value={item.task} onChange={(event) => updateAction(index, "task", event.target.value)} rows={2} aria-label={`Action ${index + 1} task`} /> : <h3>{item.task}</h3>}</div>{editing && <button type="button" onClick={() => removeAction(index)} aria-label={`Remove action ${index + 1}`}><Trash2 size={14} /></button>}</header>
                <div className="action-attributes">
                  {[['owner','Owner'],['deadline','Deadline'],['dependency','Dependency']].map(([field,label]) => <label key={field}><span>{label}</span>{editing ? <input value={item[field]} onChange={(event) => updateAction(index, field, event.target.value)} /> : <strong>{item[field]}</strong>}</label>)}
                  <label><span>Priority</span>{editing ? <select value={item.priority} onChange={(event) => updateAction(index, "priority", event.target.value)}>{priorities.map((value) => <option key={value}>{value}</option>)}</select> : <b className={`action-pill priority-${item.priority.toLowerCase().replaceAll(" ", "-")}`}>{item.priority}</b>}</label>
                  <label><span>Status</span>{editing ? <select value={item.status} onChange={(event) => updateAction(index, "status", event.target.value)}>{statuses.map((value) => <option key={value}>{value}</option>)}</select> : <b className={`action-pill action-state-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</b>}</label>
                </div>
                <footer><FileText size={13} /><span><small>Source evidence</small>{item.evidence}</span></footer>
              </article>)}
            </div>
            {editing && <button type="button" className="add-action-button" onClick={addAction}><Plus size={14} /> Add Action</button>}

            <div className="action-review-grid">
              <section><div><AlertCircle size={15} /><strong>Ambiguities</strong><b>{result.ambiguities.length}</b></div>{result.ambiguities.length ? <ul>{result.ambiguities.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>No unresolved ambiguity was identified.</p>}</section>
              <section><div><AlertTriangle size={15} /><strong>Non-actionable Points</strong><b>{result.non_actionable_points.length}</b></div>{result.non_actionable_points.length ? <ul>{result.non_actionable_points.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>No separate discussion points were recorded.</p>}</section>
            </div>
            {result.review_notes.length > 0 && <section className="action-review-notes"><ShieldCheck size={15} /><div><strong>Review Notes</strong><ul>{result.review_notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul></div></section>}

            <div className="draft-actions action-result-actions"><button type="button" className="draft-button" onClick={() => setEditing((current) => !current)}>{editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? "Finish Editing" : "Edit Actions"}</button><button type="button" className="draft-button" onClick={requestExtraction} disabled={editing}><RefreshCw size={15} /> Regenerate</button><button type="button" className="draft-button" onClick={copyActions} disabled={editing}><Clipboard size={15} /> {copyStatus || "Copy Actions"}</button><button type="button" className="approve-button" onClick={() => setApproved(true)} disabled={approved || editing}><CheckCircle2 size={15} /> {approved ? "Approved" : "Approve Actions"}</button></div>
          </div>}
        </section>
      </div>

      <section className="email-responsible-note actions-responsible-note"><div><ShieldCheck size={20} /><span><strong>Responsible Action Extraction</strong><small>AI extracts. Humans verify.</small></span></div><ul>{responsibleControls.map((control) => <li key={control}><Check size={13} />{control}</li>)}</ul></section>
    </div>
  );
}
