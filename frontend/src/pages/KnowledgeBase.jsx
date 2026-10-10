import {
  AlertCircle,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  Database,
  FilePlus2,
  FileText,
  HardDrive,
  LoaderCircle,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import SourceCard from "../components/knowledge/SourceCard";
import {
  askKnowledge,
  deleteKnowledgeDocument,
  getKnowledgeDocuments,
  getKnowledgeStatus,
  uploadKnowledgeDocument,
} from "../services/api";

const EMPTY_STATUS = { document_count: 0, chunk_count: 0, embedding_model: "—", status: "ready" };
const controls = [
  "Answers limited to retrieved company context",
  "Evidence shown with every grounded response",
  "Document instructions cannot override system rules",
  "Human review required for business-critical use",
];

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function KnowledgeBase() {
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const refreshKnowledge = useCallback(async () => {
    const [statusData, documentData] = await Promise.all([getKnowledgeStatus(), getKnowledgeDocuments()]);
    setStatus(statusData);
    setDocuments(documentData.documents);
  }, []);

  useEffect(() => {
    refreshKnowledge().catch((requestError) => setError(requestError.message));
  }, [refreshKnowledge]);

  const submitUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;
    setUploading(true); setError(""); setUploadNotice(null);
    try {
      const data = await uploadKnowledgeDocument(selectedFile);
      setUploadNotice({ filename: data.document.filename, chunks: data.document.chunks_indexed });
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await refreshKnowledge();
    } catch (requestError) {
      setError(requestError.message);
    } finally { setUploading(false); }
  };

  const removeDocument = async (document) => {
    if (!window.confirm(`Delete ${document.filename} and all of its knowledge chunks?`)) return;
    setError("");
    try { await deleteKnowledgeDocument(document.document_id); await refreshKnowledge(); }
    catch (requestError) { setError(requestError.message); }
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    if (question.trim().length < 3) return;
    setAsking(true); setError(""); setAnswer(null);
    try { setAnswer(await askKnowledge(question.trim(), 4)); }
    catch (requestError) { setError(requestError.message); }
    finally { setAsking(false); }
  };

  const modelLabel = status.embedding_model.split("/").pop()?.replace("all-", "") || "—";

  return (
    <div className="knowledge-page">
      <header className="knowledge-hero">
        <div>
          <span className="knowledge-eyebrow"><BrainCircuit size={14} /> RAG Knowledge Engine</span>
          <h1>Company Knowledge</h1>
          <p>Build the trusted knowledge layer behind WorkFlowAI.</p>
          <div className="knowledge-badges"><span>RAG Enabled</span><span>Local Embeddings</span><span>Source Grounded</span></div>
        </div>
        <div className="knowledge-hero-mark"><Database size={35} /><i /><i /><i /></div>
      </header>

      {error && <div className="knowledge-alert error"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}
      {uploadNotice && <div className="knowledge-alert success"><CheckCircle2 size={17} /><span><strong>Knowledge indexed successfully</strong>{uploadNotice.chunks} chunks added from {uploadNotice.filename}</span></div>}

      <section className="knowledge-metrics" aria-label="Knowledge status">
        {[
          [FileText, "Documents", status.document_count],
          [Database, "Knowledge Chunks", status.chunk_count],
          [BrainCircuit, "Embedding Model", modelLabel],
          [HardDrive, "Knowledge Engine", status.status === "ready" ? "Ready" : status.status],
        ].map(([Icon, label, value]) => <article key={label}><span><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong></div></article>)}
      </section>

      <div className="knowledge-grid">
        <section className="knowledge-panel upload-panel">
          <div className="knowledge-panel-heading"><div><FilePlus2 size={18} /><span><h2>Add Company Knowledge</h2><p>Upload approved organizational documents to make WorkFlowAI context-aware.</p></span></div></div>
          <form onSubmit={submitUpload}>
            <label className={`upload-dropzone ${selectedFile ? "selected" : ""}`}>
              <input ref={fileInput} type="file" accept=".pdf,.docx,.txt" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} disabled={uploading} />
              <span className="upload-icon"><UploadCloud size={23} /></span>
              <strong>{selectedFile ? selectedFile.name : "Choose an approved document"}</strong>
              <small>{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB selected` : "PDF, DOCX or TXT · 10 MB maximum"}</small>
            </label>
            <button className="knowledge-primary" type="submit" disabled={!selectedFile || uploading}>
              {uploading ? <><LoaderCircle className="spin" size={16} /> Processing and indexing document...</> : <><Sparkles size={16} /> Index Document</>}
            </button>
          </form>
        </section>

        <section className="knowledge-panel library-panel">
          <div className="knowledge-panel-heading"><div><BookOpenText size={18} /><span><h2>Document Library</h2><p>Approved sources available to the knowledge engine.</p></span></div><b>{documents.length}</b></div>
          <div className="document-list">
            {documents.length === 0 ? <div className="knowledge-empty"><BookOpenText size={27} /><strong>Your knowledge base is empty</strong><p>Upload an approved company document to enable source-grounded AI.</p></div> : documents.map((document) => (
              <article className="document-row" key={document.document_id}>
                <span className="document-type">{document.file_type.toUpperCase()}</span>
                <div><strong>{document.filename}</strong><small>{document.chunks} knowledge chunks · Indexed {formatDate(document.uploaded_at)}</small></div>
                <button type="button" onClick={() => removeDocument(document)} aria-label={`Delete ${document.filename}`}><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rag-lab">
        <div className="rag-lab-intro"><span><MessageSquareText size={18} /></span><div><small>RAG LAB</small><h2>Ask Company Knowledge</h2><p>Ask a workplace question and see exactly which sources WorkFlowAI retrieves.</p></div></div>
        <form className="rag-question" onSubmit={submitQuestion}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} placeholder="What is the escalation process for unresolved blockers?" disabled={asking} />
          <button className="knowledge-primary" disabled={asking || question.trim().length < 3}>{asking ? <><LoaderCircle className="spin" size={16} /> Retrieving evidence...</> : <><SearchCheck size={16} /> Ask Knowledge</>}</button>
        </form>

        {answer && (answer.insufficient_context ? (
          <div className="insufficient-state"><AlertCircle size={24} /><div><strong>Insufficient company knowledge</strong><p>The indexed documents do not contain enough information to answer this question reliably.</p><small>Try uploading a relevant policy, SOP or project document.</small></div></div>
        ) : (
          <div className="rag-result">
            <div className="answer-card"><div className="answer-label"><span>KNOWLEDGE-GROUNDED ANSWER</span><b>Grounded with {answer.sources.length} {answer.sources.length === 1 ? "source" : "sources"}</b></div><p>{answer.answer}</p></div>
            <div className="evidence-heading"><div><h3>Evidence</h3><p>Retrieved passages supporting this answer.</p></div><span>{answer.sources.length} SOURCES</span></div>
            <div className="source-grid">{answer.sources.map((source) => <SourceCard key={source.source_id} source={source} />)}</div>
          </div>
        ))}
      </section>

      <section className="grounding-panel"><div><ShieldCheck size={20} /><span><strong>Knowledge Grounding</strong><small>Responsible controls for organization-aware AI</small></span></div><ul>{controls.map((control) => <li key={control}><CheckCircle2 size={13} />{control}</li>)}</ul></section>
    </div>
  );
}
