import {
  AlertCircle,
  AlertTriangle,
  BookOpenText,
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  Database,
  FileQuestion,
  Lightbulb,
  GitCompareArrows,
  Info,
  ListChecks,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SourceCard from "../components/knowledge/SourceCard";
import { getKnowledgeStatus, summarizeMeeting } from "../services/api";

const EMPTY_FORM = {
  meeting_title: "",
  meeting_context: "",
  participants: "",
  summary_style: "Standard",
  meeting_content: "",
};

const DEMO_FORM = {
  meeting_title: "Project Sync - NovaTech Dashboard",
  meeting_context: "Internal project status meeting",
  participants: "Project Manager, Frontend Team, Backend Team, Priya, Rahul",
  summary_style: "Detailed",
  meeting_content: `The dashboard module is complete.

Payment integration remains blocked because client API credentials have not yet been received.

The team agreed that the client should be informed about the blocker.

Rahul suggested Friday as the release date.

The team agreed to tell the client that the product will be released Friday.

No project-manager approval was mentioned.`,
};

const SECTION_CONFIG = {
  key_discussion_points: { title: "Key Discussion Points", icon: MessageSquareText, empty: "No discussion points were identified in the supplied content." },
  risks_and_blockers: { title: "Risks & Blockers", icon: AlertTriangle, empty: "No risks or blockers were identified in the supplied content." },
  open_questions: { title: "Open Questions", icon: FileQuestion, empty: "No open questions were identified in the supplied content." },
  ambiguities: { title: "Ambiguities", icon: Lightbulb, empty: "No ambiguities were identified in the supplied content." },
};

const responsibleControls = [
  "Source-grounded analysis",
  "Meeting facts stay separate from company context",
  "Suggestions are not treated as decisions",
  "Missing owners and dates are not invented",
  "Human verification required",
];

function ContextFindings({ title, icon: Icon, items, tone }) {
  if (!items?.length) return null;
  return (
    <section className={`context-findings ${tone}`}>
      <div className="context-findings-title"><Icon size={16} /><h4>{title}</h4><span>{items.length}</span></div>
      <div className="context-findings-list">
        {items.map((item, index) => (
          <article key={`${item.title}-${index}`}>
            <div><strong>{item.title}</strong>{item.severity && <b className={`severity-${item.severity}`}>{item.severity}</b>}</div>
            <p>{item.message}</p>
            <small>Evidence: {item.sources.join(", ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function TextListSection({ sectionKey, items, editing, onChange, onAdd, onRemove }) {
  const config = SECTION_CONFIG[sectionKey];
  const Icon = config.icon;

  return (
    <section className={`meeting-result-section ${sectionKey === "risks_and_blockers" ? "warning-section" : ""}`}>
      <div className="meeting-section-title"><Icon size={16} /><h3>{config.title}</h3><span>{items.length}</span></div>
      {items.length === 0 && !editing ? <p className="meeting-empty-copy">{config.empty}</p> : (
        <div className="meeting-list">
          {items.map((item, index) => editing ? (
            <div className="editable-row" key={`${sectionKey}-${index}`}>
              <textarea value={item} onChange={(event) => onChange(sectionKey, index, event.target.value)} rows={2} />
              <button type="button" onClick={() => onRemove(sectionKey, index)} aria-label={`Remove ${config.title} item`}><Trash2 size={14} /></button>
            </div>
          ) : <div className="meeting-list-item" key={`${item}-${index}`}><i />{item}</div>)}
        </div>
      )}
      {editing && <button type="button" className="add-item-button" onClick={() => onAdd(sectionKey)}><Plus size={13} /> Add item</button>}
    </section>
  );
}

export default function MeetingSummarizer() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedByUser, setEditedByUser] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [mode, setMode] = useState("transcript");
  const [knowledgeStatus, setKnowledgeStatus] = useState(null);
  const [knowledge, setKnowledge] = useState(null);

  useEffect(() => {
    if (mode !== "knowledge") return;
    getKnowledgeStatus().then(setKnowledgeStatus).catch(() => setKnowledgeStatus(null));
  }, [mode]);

  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSummary(null);
    setKnowledge(null);
    setError("");
    setEditing(false);
    setEditedByUser(false);
    setApproved(false);
    setCopyStatus("");
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateSummary = (updater) => {
    setSummary((current) => updater(current));
    setEditedByUser(true);
    setApproved(false);
  };

  const updateListItem = (section, index, value) => updateSummary((current) => ({
    ...current,
    [section]: current[section].map((item, itemIndex) => itemIndex === index ? value : item),
  }));

  const addListItem = (section) => updateSummary((current) => ({ ...current, [section]: [...current[section], ""] }));
  const removeListItem = (section, index) => updateSummary((current) => ({
    ...current,
    [section]: current[section].filter((_, itemIndex) => itemIndex !== index),
  }));

  const updateDecision = (index, field, value) => updateSummary((current) => ({
    ...current,
    confirmed_decisions: current.confirmed_decisions.map((decision, itemIndex) => itemIndex === index ? { ...decision, [field]: value } : decision),
  }));

  const updateAction = (index, field, value) => updateSummary((current) => ({
    ...current,
    action_items: current.action_items.map((action, itemIndex) => itemIndex === index ? { ...action, [field]: value } : action),
  }));

  const requestSummary = async () => {
    setLoading(true);
    setError("");
    setApproved(false);
    setEditing(false);
    setCopyStatus("");

    try {
      const response = await summarizeMeeting({ ...form, knowledge_grounding: mode === "knowledge" });
      setSummary(response.summary);
      setKnowledge(response.knowledge);
      setEditedByUser(false);
    } catch (requestError) {
      setError(requestError.message || "The AI service could not complete this request. Your meeting content has been preserved.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    requestSummary();
  };

  const loadDemo = () => {
    setForm(DEMO_FORM);
    setSummary(null);
    setKnowledge(null);
    setError("");
    setEditing(false);
    setEditedByUser(false);
    setApproved(false);
  };

  const formatSummary = () => {
    const lines = ["MEETING SUMMARY", "", `Overview:\n${summary.meeting_overview}`, ""];
    const appendList = (title, items) => {
      lines.push(`${title}:`);
      lines.push(...(items.length ? items.map((item) => `- ${item}`) : ["- None identified in the supplied content."]));
      lines.push("");
    };
    appendList("Key Discussion Points", summary.key_discussion_points);
    lines.push("Confirmed Decisions:");
    lines.push(...(summary.confirmed_decisions.length ? summary.confirmed_decisions.map((item) => `- ${item.decision}\n  Evidence: ${item.evidence}`) : ["- No confirmed decisions were identified in the supplied content."]));
    lines.push("", "Action Items:");
    lines.push(...(summary.action_items.length ? summary.action_items.map((item, index) => `${index + 1}. Task: ${item.task}\n   Owner: ${item.owner}\n   Deadline: ${item.deadline}\n   Status: ${item.status}`) : ["- None identified in the supplied content."]));
    lines.push("");
    appendList("Risks / Blockers", summary.risks_and_blockers);
    appendList("Open Questions", summary.open_questions);
    appendList("Ambiguities", summary.ambiguities);
    if (summary.review_notes.length) appendList("Review Notes", summary.review_notes);
    return lines.join("\n");
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatSummary());
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  const startNewSummary = () => {
    const hasContent = summary || form.meeting_title || form.meeting_context || form.participants || form.meeting_content;
    if (hasContent && !window.confirm("Start a new meeting summary and clear the current content?")) return;
    setForm(EMPTY_FORM);
    setSummary(null);
    setKnowledge(null);
    setError("");
    setEditing(false);
    setEditedByUser(false);
    setApproved(false);
    setCopyStatus("");
  };

  return (
    <div className="meeting-page">
      <header className="meeting-page-header">
        <div>
          <span className="meeting-workflow-tag"><MessageSquareText size={13} /> Meetings</span>
          <h1>Meeting Summarizer</h1>
          <p>Turn raw conversations into structured decisions, actions and reviewable meeting intelligence.</p>
        </div>
        <div className="source-grounded-label"><ShieldCheck size={17} /><span>Source-grounded summary</span></div>
      </header>

      <div className="meeting-workspace">
        <section className="email-panel meeting-input-panel">
          <div className="email-panel-heading">
            <div><span>01</span><h2>Meeting Input</h2></div>
            <button type="button" className="text-action" onClick={loadDemo} disabled={loading}>Load Demo</button>
          </div>
          <form className="email-form meeting-form" onSubmit={handleSubmit}>
            <fieldset className="generation-mode meeting-intelligence-mode" disabled={loading}>
              <legend>Meeting Intelligence Mode</legend>
              <div className="mode-options">
                <button type="button" className={mode === "transcript" ? "active" : ""} onClick={() => changeMode("transcript")} aria-pressed={mode === "transcript"}>
                  <span><MessageSquareText size={17} /></span><div><strong>Transcript Only</strong><small>Source-grounded meeting summary.</small></div>
                </button>
                <button type="button" className={mode === "knowledge" ? "active grounded" : ""} onClick={() => changeMode("knowledge")} aria-pressed={mode === "knowledge"}>
                  <span><Building2 size={17} /></span><div><strong>Knowledge Aware</strong><small>Meeting summary plus organizational context.</small></div><b>RAG</b>
                </button>
              </div>
              {mode === "knowledge" && (
                <div className={`grounding-status ${knowledgeStatus?.document_count ? "ready" : "empty"}`}>
                  <Database size={15} />
                  <div><strong>Company Knowledge</strong>{knowledgeStatus ? (knowledgeStatus.document_count > 0 ? <small>{knowledgeStatus.document_count} documents · {knowledgeStatus.chunk_count} chunks · Ready</small> : <small>No company knowledge indexed</small>) : <small>Checking knowledge engine…</small>}</div>
                  <Link to="/knowledge">Open Company Knowledge</Link>
                </div>
              )}
            </fieldset>

            <label className="form-field">
              <span>Meeting Title <em>Optional</em></span>
              <input name="meeting_title" value={form.meeting_title} onChange={updateField} maxLength={200} placeholder="Weekly Product Sync" disabled={loading} />
            </label>
            <label className="form-field">
              <span>Meeting Context <em>Optional</em></span>
              <input name="meeting_context" value={form.meeting_context} onChange={updateField} maxLength={1000} placeholder="Internal project status meeting" disabled={loading} />
            </label>
            <div className="form-row meeting-meta-row">
              <label className="form-field">
                <span>Participants <em>Optional</em></span>
                <input name="participants" value={form.participants} onChange={updateField} maxLength={1000} placeholder="e.g. Project Manager, Frontend Team" disabled={loading} />
              </label>
              <label className="form-field">
                <span>Summary Style <em>Required</em></span>
                <select name="summary_style" value={form.summary_style} onChange={updateField} disabled={loading}>
                  <option>Concise</option><option>Standard</option><option>Detailed</option>
                </select>
              </label>
            </div>
            <label className="form-field transcript-field">
              <span>Meeting Notes / Transcript <em>Required</em></span>
              <textarea name="meeting_content" value={form.meeting_content} onChange={updateField} minLength={30} maxLength={20000} rows={16} required disabled={loading} placeholder={"Paste meeting notes or transcript here...\n\nExample:\nThe dashboard module is complete.\nThe payment integration remains blocked because API credentials have not been received.\nThe team discussed a possible Friday release, but no final release date was agreed."} />
              <small>{form.meeting_content.length.toLocaleString()} / 20,000</small>
            </label>
            <p className="privacy-note"><ShieldCheck size={13} /> Avoid entering confidential or sensitive information unless your organization&apos;s approved AI policy permits it.</p>
            <div className="form-actions">
              <button className="generate-button" type="submit" disabled={loading}>
                {loading ? <RefreshCw className="spin" size={17} /> : <Sparkles size={17} />}
                {loading ? (mode === "knowledge" ? "Summarizing, then checking context..." : "Analyzing meeting...") : (mode === "knowledge" ? "Summarize + Check Knowledge" : "Summarize Meeting")}
              </button>
              <span>Temporary session only.</span>
            </div>
          </form>
        </section>

        <section className="email-panel meeting-result-panel" aria-live="polite">
          <div className="email-panel-heading">
            <div><span>02</span><h2>Meeting Intelligence</h2></div>
            {summary && <button type="button" className="text-action muted" onClick={startNewSummary} disabled={loading}><RotateCcw size={13} /> New Summary</button>}
          </div>

          {error && !loading && (
            <div className="email-error" role="alert">
              <AlertCircle size={21} />
              <div><strong>Unable to summarize the meeting</strong><p>{error}</p></div>
              <button type="button" onClick={requestSummary}>Try Again</button>
            </div>
          )}
          {loading && (
            <div className="draft-loading meeting-loading">
              <div className="loading-mark"><MessageSquareText size={23} /></div>
              <strong>Analyzing meeting...</strong>
              <p>{mode === "knowledge" ? "Summarizing the transcript first, then checking separate organizational context." : "Identifying decisions, actions and unresolved points."}</p>
              <div className="loading-lines"><span /><span /><span /><span /></div>
            </div>
          )}
          {!summary && !loading && !error && (
            <div className="draft-empty meeting-empty">
              <div className="empty-mail"><MessageSquareText size={27} /></div>
              <h3>Your meeting intelligence will appear here</h3>
              <p>Paste notes or a transcript to extract discussions, confirmed decisions, actions and risks.</p>
              <div className="empty-steps"><span>Source</span><i /><span>Analyze</span><i /><span>Verify</span></div>
            </div>
          )}

          {summary && !loading && (
            <div className="meeting-summary-content">
              <div className={`human-review-banner ${approved ? "approved" : ""}`}>
                <div className="review-banner-icon">{approved ? <CheckCircle2 size={19} /> : <ShieldCheck size={19} />}</div>
                <div><strong>{approved ? "Human Approved" : "AI-generated meeting summary"}</strong><span>{approved ? "Reviewed and approved by the user" : "Human review required"}</span></div>
                {editedByUser && <span className="edited-badge"><Pencil size={11} /> Edited by user</span>}
              </div>

              <section className="meeting-overview-card">
                <div className="meeting-section-title"><Sparkles size={16} /><h3>Meeting Overview</h3></div>
                {editing ? <textarea value={summary.meeting_overview} onChange={(event) => updateSummary((current) => ({ ...current, meeting_overview: event.target.value }))} rows={5} /> : <p>{summary.meeting_overview}</p>}
              </section>

              <TextListSection sectionKey="key_discussion_points" items={summary.key_discussion_points} editing={editing} onChange={updateListItem} onAdd={addListItem} onRemove={removeListItem} />

              <section className="meeting-result-section decisions-section">
                <div className="meeting-section-title"><CheckCircle2 size={16} /><h3>Confirmed Decisions</h3><span>{summary.confirmed_decisions.length}</span></div>
                {!summary.confirmed_decisions.length && !editing ? <p className="meeting-empty-copy">No confirmed decisions were identified in the supplied content.</p> : (
                  <div className="decision-list">{summary.confirmed_decisions.map((decision, index) => editing ? (
                    <div className="decision-card editable-object" key={`decision-${index}`}>
                      <textarea value={decision.decision} onChange={(event) => updateDecision(index, "decision", event.target.value)} rows={2} aria-label="Decision" />
                      <input value={decision.evidence} onChange={(event) => updateDecision(index, "evidence", event.target.value)} aria-label="Decision evidence" />
                      <button type="button" onClick={() => updateSummary((current) => ({ ...current, confirmed_decisions: current.confirmed_decisions.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={14} /> Remove</button>
                    </div>
                  ) : <div className="decision-card" key={`${decision.decision}-${index}`}><strong>{decision.decision}</strong><span>Source grounding</span><p>{decision.evidence}</p></div>)}</div>
                )}
                {editing && <button type="button" className="add-item-button" onClick={() => updateSummary((current) => ({ ...current, confirmed_decisions: [...current.confirmed_decisions, { decision: "", evidence: "" }] }))}><Plus size={13} /> Add decision</button>}
              </section>

              <section className="meeting-result-section actions-section">
                <div className="meeting-section-title"><ListChecks size={16} /><h3>Action Items</h3><span>{summary.action_items.length}</span></div>
                {!summary.action_items.length && !editing ? <p className="meeting-empty-copy">No action items were identified in the supplied content.</p> : (
                  <div className="action-list">{summary.action_items.map((action, index) => (
                    <div className="action-card" key={`${action.task}-${index}`}>
                      <div className="action-number">{String(index + 1).padStart(2, "0")}</div>
                      {editing ? (
                        <div className="action-edit-grid">
                          <textarea value={action.task} onChange={(event) => updateAction(index, "task", event.target.value)} rows={2} aria-label="Action task" />
                          <input value={action.owner} onChange={(event) => updateAction(index, "owner", event.target.value)} aria-label="Action owner" />
                          <input value={action.deadline} onChange={(event) => updateAction(index, "deadline", event.target.value)} aria-label="Action deadline" />
                          <select value={action.status} onChange={(event) => updateAction(index, "status", event.target.value)} aria-label="Action status"><option>Open</option><option>In Progress</option><option>Completed</option><option>Blocked</option><option>Not specified</option></select>
                          <button type="button" onClick={() => updateSummary((current) => ({ ...current, action_items: current.action_items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={14} /> Remove</button>
                        </div>
                      ) : (
                        <div className="action-card-content"><strong>{action.task}</strong><dl><div><dt>Owner</dt><dd>{action.owner}</dd></div><div><dt>Deadline</dt><dd>{action.deadline}</dd></div><div><dt>Status</dt><dd><span className={`action-status status-${action.status.toLowerCase().replaceAll(" ", "-")}`}>{action.status}</span></dd></div></dl></div>
                      )}
                    </div>
                  ))}</div>
                )}
                {editing && <button type="button" className="add-item-button" onClick={() => updateSummary((current) => ({ ...current, action_items: [...current.action_items, { task: "", owner: "Not specified", deadline: "Not specified", status: "Open" }] }))}><Plus size={13} /> Add action</button>}
              </section>

              <TextListSection sectionKey="risks_and_blockers" items={summary.risks_and_blockers} editing={editing} onChange={updateListItem} onAdd={addListItem} onRemove={removeListItem} />
              <TextListSection sectionKey="open_questions" items={summary.open_questions} editing={editing} onChange={updateListItem} onAdd={addListItem} onRemove={removeListItem} />
              <TextListSection sectionKey="ambiguities" items={summary.ambiguities} editing={editing} onChange={updateListItem} onAdd={addListItem} onRemove={removeListItem} />

              {summary.review_notes.length > 0 && <section className="meeting-result-section review-notes-section"><div className="meeting-section-title"><ShieldCheck size={16} /><h3>Review Notes</h3></div><div className="meeting-list">{summary.review_notes.map((note, index) => <div className="meeting-list-item" key={`${note}-${index}`}><i />{note}</div>)}</div></section>}

              {knowledge?.requested && (
                <section className={`organizational-context ${knowledge.grounded ? "grounded" : "empty"}`}>
                  <header className="organizational-context-header">
                    <div className="context-icon"><Building2 size={19} /></div>
                    <div><span>ORGANIZATIONAL CONTEXT</span><h3>Company Knowledge Analysis</h3><p>This information comes from Company Knowledge and was not necessarily discussed during the meeting.</p></div>
                    <b>{knowledge.grounded ? `${knowledge.sources.length} sources` : "Transcript only"}</b>
                  </header>

                  {!knowledge.grounded ? (
                    <div className="no-context-state"><Info size={19} /><div><strong>No relevant organizational context found</strong><p>{knowledge.message || "The meeting summary remains based only on the supplied transcript."}</p></div></div>
                  ) : (
                    <div className="context-body">
                      <ContextFindings title="Policy Alerts" icon={ShieldCheck} items={knowledge.policy_alerts} tone="alerts" />
                      <ContextFindings title="Related Company Knowledge" icon={BookOpenText} items={knowledge.related_knowledge} tone="related" />
                      <ContextFindings title="Potential Conflicts" icon={GitCompareArrows} items={knowledge.potential_conflicts} tone="conflicts" />
                      {knowledge.knowledge_notes?.length > 0 && <section className="context-notes"><h4>Knowledge Notes</h4><ul>{knowledge.knowledge_notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul></section>}
                      {knowledge.sources.length > 0 && <section className="meeting-evidence"><div><BookOpenText size={15} /><span><strong>Supporting Evidence</strong><small>Read-only source passages from Company Knowledge</small></span></div><div className="meeting-source-grid">{knowledge.sources.map((source) => <SourceCard key={source.source_id} source={source} />)}</div></section>}
                    </div>
                  )}
                </section>
              )}

              <div className="draft-actions meeting-actions">
                <button type="button" className="draft-button" onClick={() => setEditing((current) => !current)}>{editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? "Finish Editing" : "Edit Summary"}</button>
                <button type="button" className="draft-button" onClick={requestSummary} disabled={editing}><RefreshCw size={15} /> Regenerate</button>
                <button type="button" className="draft-button" onClick={copySummary} disabled={editing}><Clipboard size={15} /> {copyStatus || "Copy Summary"}</button>
                <button type="button" className="approve-button" onClick={() => setApproved(true)} disabled={approved || editing}><CheckCircle2 size={15} /> {approved ? "Approved" : "Approve Summary"}</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="email-responsible-note meeting-responsible-note">
        <div><ShieldCheck size={20} /><span><strong>Responsible Meeting Intelligence</strong><small>AI summarizes. Humans verify.</small></span></div>
        <ul>{responsibleControls.map((control) => <li key={control}><Check size={13} />{control}</li>)}</ul>
      </section>
    </div>
  );
}
