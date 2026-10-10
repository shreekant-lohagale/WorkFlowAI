import {
  AlertCircle,
  BookOpenText,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Database,
  FileWarning,
  Mail,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SourceCard from "../components/knowledge/SourceCard";
import { generateEmail, getKnowledgeStatus } from "../services/api";

const EMPTY_FORM = {
  purpose: "",
  recipient_context: "",
  tone: "Professional",
  key_points: "",
  additional_context: "",
};

const DEMO_FORM = {
  purpose: "Send client project update",
  recipient_context: "Client",
  tone: "Professional",
  key_points: [
    "- Dashboard module has been completed.",
    "- Payment API integration is currently blocked.",
    "- API credentials are still pending from the client.",
    "- Tell the client that we will release on Friday.",
  ].join("\n"),
  additional_context: "Keep the message concise and collaborative.",
};

const responsibleControls = [
  "Uses only supplied facts",
  "Optional company-knowledge grounding",
  "Policy conflicts are surfaced, not hidden",
  "Missing information is not invented",
  "Human approval remains mandatory",
];

export default function EmailAssistant() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedByUser, setEditedByUser] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [mode, setMode] = useState("standard");
  const [knowledgeStatus, setKnowledgeStatus] = useState(null);
  const [knowledge, setKnowledge] = useState(null);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  useEffect(() => {
    if (mode !== "grounded") return;
    getKnowledgeStatus()
      .then(setKnowledgeStatus)
      .catch(() => setKnowledgeStatus(null));
  }, [mode]);

  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setDraft(null);
    setKnowledge(null);
    setEvidenceExpanded(false);
    setError("");
    setApproved(false);
    setEditing(false);
    setEditedByUser(false);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateDraft = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setEditedByUser(true);
    setApproved(false);
  };

  const requestDraft = async () => {
    setLoading(true);
    setError("");
    setApproved(false);
    setEditing(false);
    setCopyStatus("");

    try {
      const response = await generateEmail({ ...form, knowledge_grounding: mode === "grounded" });
      setDraft(response.draft);
      setKnowledge(response.knowledge);
      setEvidenceExpanded(false);
      setEditedByUser(false);
    } catch (requestError) {
      setError(requestError.message || "The AI service could not complete this request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    requestDraft();
  };

  const loadDemo = () => {
    setForm(DEMO_FORM);
    setDraft(null);
    setKnowledge(null);
    setEvidenceExpanded(false);
    setError("");
    setApproved(false);
    setEditedByUser(false);
  };

  const copyEmail = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  const startNewDraft = () => {
    const hasContent = draft || form.purpose || form.recipient_context || form.key_points || form.additional_context;
    if (hasContent && !window.confirm("Start a new draft and clear the current content?")) return;

    setForm(EMPTY_FORM);
    setDraft(null);
    setKnowledge(null);
    setEvidenceExpanded(false);
    setError("");
    setEditing(false);
    setEditedByUser(false);
    setApproved(false);
    setCopyStatus("");
  };

  return (
    <div className="email-page">
      <header className="email-page-header">
        <div>
          <span className="email-workflow-tag"><Mail size={13} /> Communication</span>
          <h1>Email Assistant</h1>
          <p>Turn rough workplace points into clear, professional communication.</p>
        </div>
        <div className="review-reminder"><ShieldCheck size={17} /><span>AI-generated drafts require human review.</span></div>
      </header>

      <div className="email-workspace">
        <section className="email-panel input-panel">
          <div className="email-panel-heading">
            <div><span>01</span><h2>Input</h2></div>
            <button type="button" className="text-action" onClick={loadDemo} disabled={loading}>Load Demo</button>
          </div>

          <form className="email-form" onSubmit={handleSubmit}>
            <fieldset className="generation-mode" disabled={loading}>
              <legend>Generation Mode</legend>
              <div className="mode-options">
                <button type="button" className={mode === "standard" ? "active" : ""} onClick={() => changeMode("standard")} aria-pressed={mode === "standard"}>
                  <span><Bot size={17} /></span><div><strong>Standard AI</strong><small>Uses only the information you provide.</small></div>
                </button>
                <button type="button" className={mode === "grounded" ? "active grounded" : ""} onClick={() => changeMode("grounded")} aria-pressed={mode === "grounded"}>
                  <span><BookOpenText size={17} /></span><div><strong>Knowledge Grounded</strong><small>Your input plus relevant company knowledge.</small></div><b>RAG</b>
                </button>
              </div>
              {mode === "grounded" && (
                <div className={`grounding-status ${knowledgeStatus?.document_count ? "ready" : "empty"}`}>
                  <Database size={15} />
                  <div>
                    <strong>Company Knowledge</strong>
                    {knowledgeStatus ? (
                      knowledgeStatus.document_count > 0
                        ? <small>{knowledgeStatus.document_count} documents · {knowledgeStatus.chunk_count} chunks · Engine ready</small>
                        : <small>No company knowledge indexed</small>
                    ) : <small>Checking knowledge engine…</small>}
                  </div>
                  <Link to="/knowledge">Open Company Knowledge</Link>
                </div>
              )}
            </fieldset>

            <label className="form-field">
              <span>Purpose <em>Required</em></span>
              <input name="purpose" value={form.purpose} onChange={updateField} minLength={3} maxLength={300} placeholder="e.g. Follow up on project progress" required disabled={loading} />
            </label>

            <div className="form-row">
              <label className="form-field">
                <span>Recipient Context <em>Required</em></span>
                <input name="recipient_context" list="recipient-options" value={form.recipient_context} onChange={updateField} minLength={2} maxLength={200} placeholder="e.g. Client" required disabled={loading} />
                <datalist id="recipient-options">
                  <option value="Client" /><option value="Manager" /><option value="Team Member" />
                  <option value="Vendor" /><option value="Recruiter" /><option value="Other" />
                </datalist>
              </label>
              <label className="form-field">
                <span>Tone <em>Required</em></span>
                <select name="tone" value={form.tone} onChange={updateField} disabled={loading}>
                  <option>Professional</option><option>Concise</option>
                  <option>Friendly Professional</option><option>Formal</option>
                </select>
              </label>
            </div>

            <label className="form-field key-points-field">
              <span>Key Points <em>Required</em></span>
              <textarea name="key_points" value={form.key_points} onChange={updateField} minLength={10} maxLength={6000} rows={10} required disabled={loading} placeholder={"Enter the facts you want included in the email.\n\nExample:\n- Dashboard module completed\n- Payment integration is blocked\n- API credentials are still pending\n- Request credentials by Wednesday"} />
              <small>{form.key_points.length.toLocaleString()} / 6,000</small>
            </label>

            <label className="form-field">
              <span>Additional Context <em>Optional</em></span>
              <textarea name="additional_context" value={form.additional_context} onChange={updateField} maxLength={2000} rows={3} disabled={loading} placeholder="Optional context that may help the AI draft the email." />
            </label>

            <div className="form-actions">
              <button className="generate-button" type="submit" disabled={loading}>
                {loading ? <RefreshCw className="spin" size={17} /> : <Sparkles size={17} />}
                {loading ? (mode === "grounded" ? "Retrieving knowledge and drafting..." : "Generating draft...") : (mode === "grounded" ? "Generate Grounded Email" : "Generate Email")}
              </button>
              <span>No email will be sent.</span>
            </div>
          </form>
        </section>

        <section className="email-panel result-panel" aria-live="polite">
          <div className="email-panel-heading">
            <div><span>02</span><h2>AI Draft</h2></div>
            {draft && <button type="button" className="text-action muted" onClick={startNewDraft} disabled={loading}><RotateCcw size={13} /> New Draft</button>}
          </div>

          {error && !loading && (
            <div className="email-error" role="alert">
              <AlertCircle size={21} />
              <div><strong>Unable to generate the draft</strong><p>{error}</p></div>
              <button type="button" onClick={requestDraft}>Try Again</button>
            </div>
          )}

          {loading && (
            <div className="draft-loading">
              <div className="loading-mark"><Sparkles size={23} /></div>
              <strong>Crafting your email draft</strong>
              <p>{mode === "grounded" ? "Retrieving relevant company evidence and checking policy context." : "Structuring the supplied facts without adding missing details."}</p>
              <div className="loading-lines"><span /><span /><span /><span /></div>
            </div>
          )}

          {!draft && !loading && !error && (
            <div className="draft-empty">
              <div className="empty-mail"><Mail size={27} /></div>
              <h3>Your AI draft will appear here</h3>
              <p>Add your workplace context and generate a reviewable email draft.</p>
              <div className="empty-steps"><span>Supply facts</span><i /><span>Generate</span><i /><span>Review</span></div>
            </div>
          )}

          {draft && !loading && (
            <div className="draft-content">
              <div className={`human-review-banner ${approved ? "approved" : ""}`}>
                <div className="review-banner-icon">{approved ? <CheckCircle2 size={19} /> : <FileWarning size={19} />}</div>
                <div>
                  <strong>{approved ? "Human Approved" : "AI-generated draft"}</strong>
                  <span>{approved ? "Reviewed and approved by the user" : "Human review required before use"}</span>
                </div>
                {editedByUser && <span className="edited-badge"><Pencil size={11} /> Edited by user</span>}
              </div>

              <div className={`draft-context-strip ${knowledge?.grounded ? "grounded" : "standard"}`}>
                <span>{knowledge?.grounded ? <BookOpenText size={14} /> : <Bot size={14} />}{knowledge?.grounded ? "Knowledge Grounded" : "Standard Context"}</span>
                {knowledge?.grounded && <b>{knowledge.sources.length} {knowledge.sources.length === 1 ? "Source" : "Sources"} Used</b>}
                {knowledge?.requested && !knowledge?.grounded && <b>{knowledge.message || "No relevant company context"}</b>}
              </div>

              {draft.knowledge_alerts?.length > 0 && (
                <div className="knowledge-alert-panel">
                  <div><FileWarning size={17} /><strong>Knowledge Alert</strong></div>
                  <ul>{draft.knowledge_alerts.map((alert, index) => <li key={`${alert}-${index}`}>{alert}</li>)}</ul>
                </div>
              )}

              <div className="draft-field">
                <span>Subject</span>
                {editing ? <input name="subject" value={draft.subject} onChange={updateDraft} maxLength={300} /> : <h3>{draft.subject}</h3>}
              </div>
              <div className="draft-field body-field">
                <span>Email Body</span>
                {editing ? <textarea name="body" value={draft.body} onChange={updateDraft} rows={14} maxLength={12000} /> : <div className="email-body">{draft.body}</div>}
              </div>

              <div className="draft-detail-grid">
                <div className="draft-detail">
                  <span><AlertCircle size={14} /> Missing Information</span>
                  {draft.missing_information.length ? (
                    <ul>{draft.missing_information.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
                  ) : <p className="clear-detail"><Check size={13} /> No critical missing information detected.</p>}
                </div>
                {draft.review_notes.length > 0 && (
                  <div className="draft-detail">
                    <span><ShieldCheck size={14} /> Review Notes</span>
                    <ul>{draft.review_notes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
                  </div>
                )}
              </div>

              <div className="draft-actions">
                <button type="button" className="draft-button" onClick={() => setEditing((current) => !current)}>
                  {editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? "Finish Editing" : "Edit Draft"}
                </button>
                <button type="button" className="draft-button" onClick={requestDraft} disabled={editing}>
                  <RefreshCw size={15} /> Regenerate
                </button>
                <button type="button" className="draft-button" onClick={copyEmail} disabled={editing}>
                  <Clipboard size={15} /> {copyStatus || "Copy Email"}
                </button>
                <button type="button" className="approve-button" onClick={() => setApproved(true)} disabled={approved || editing}>
                  <CheckCircle2 size={15} /> {approved ? "Approved" : "Approve Draft"}
                </button>
              </div>

              {knowledge?.grounded && knowledge.sources.length > 0 && (
                <section className="email-evidence">
                  <button type="button" className="evidence-toggle" onClick={() => setEvidenceExpanded((current) => !current)} aria-expanded={evidenceExpanded}>
                    <span><BookOpenText size={15} /><strong>Sources Used</strong><small>{knowledge.sources.length} retrieved evidence {knowledge.sources.length === 1 ? "source" : "sources"}</small></span>
                    <span>{evidenceExpanded ? "Hide Evidence" : "View Evidence"}<ChevronDown className={evidenceExpanded ? "expanded" : ""} size={15} /></span>
                  </button>
                  {evidenceExpanded && <div className="email-source-grid">{knowledge.sources.map((source) => <SourceCard key={source.source_id} source={source} />)}</div>}
                </section>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="email-responsible-note">
        <div><ShieldCheck size={20} /><span><strong>Responsible AI</strong><small>AI drafts. Humans approve.</small></span></div>
        <ul>{responsibleControls.map((control) => <li key={control}><Check size={13} />{control}</li>)}</ul>
      </section>
    </div>
  );
}
