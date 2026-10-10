import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmptyState({ title, description, icon: Icon = Sparkles }) {
  return (
    <section className="placeholder-card" aria-labelledby="placeholder-title">
      <div className="placeholder-orb">
        <Icon size={28} aria-hidden="true" />
      </div>
      <span className="eyebrow">WORKFLOW PREVIEW</span>
      <h1 id="placeholder-title">{title}</h1>
      <p>{description}</p>
      <div className="placeholder-divider" />
      <p className="placeholder-note">
        This workflow will be implemented in the next development phase.
      </p>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
      </Link>
    </section>
  );
}
