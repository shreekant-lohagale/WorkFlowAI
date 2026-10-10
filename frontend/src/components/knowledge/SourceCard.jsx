import { FileText, Layers3 } from "lucide-react";

export default function SourceCard({ source }) {
  return (
    <article className="source-card">
      <div className="source-card-header">
        <span className="source-id">{source.source_id}</span>
        <div>
          <strong>{source.filename}</strong>
          <small>{source.page ? `Page ${source.page} · ` : ""}Chunk {source.chunk_index + 1}</small>
        </div>
        <FileText size={17} aria-hidden="true" />
      </div>
      <div className="source-evidence">
        <span>Relevant evidence</span>
        <p>“{source.content}”</p>
      </div>
      <div className="similarity-row">
        <span><Layers3 size={13} /> Retrieval similarity</span>
        <strong>{Math.round(source.similarity * 100)}%</strong>
      </div>
    </article>
  );
}
